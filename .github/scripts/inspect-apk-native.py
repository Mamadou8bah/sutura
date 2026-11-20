"""Inspect ARM64 packaging without executing the APK or changing its signature."""
import struct
import sys
import zipfile
from pathlib import Path


def inspect(filename):
    path = Path(filename)
    zip_alignment = []
    elf_alignment = []
    libraries = 0
    with zipfile.ZipFile(path) as apk, path.open("rb") as raw:
        for entry in apk.infolist():
            if not entry.filename.startswith("lib/arm64-v8a/") or not entry.filename.endswith(".so"):
                continue
            libraries += 1
            if entry.compress_type == zipfile.ZIP_STORED:
                raw.seek(entry.header_offset)
                local_header = raw.read(30)
                name_size, extra_size = struct.unpack_from("<HH", local_header, 26)
                data_offset = entry.header_offset + 30 + name_size + extra_size
                if data_offset % 16384:
                    zip_alignment.append(entry.filename)
            with apk.open(entry) as library:
                header = library.read(64)
                if len(header) < 64 or header[:5] != b"\x7fELF\x02":
                    raise ValueError(f"Invalid ARM64 ELF library: {entry.filename}")
                endian = "<" if header[5] == 1 else ">"
                offset = struct.unpack_from(endian + "Q", header, 32)[0]
                size, count = struct.unpack_from(endian + "HH", header, 54)
                if size < 56 or count > 4096:
                    raise ValueError(f"Invalid ELF program headers: {entry.filename}")
                library.seek(offset)
                table = library.read(size * count)
                if len(table) != size * count:
                    raise ValueError(f"Truncated ELF program headers: {entry.filename}")
                for i in range(count):
                    if struct.unpack_from(endian + "I", table, i * size)[0] != 1:
                        continue
                    alignment = struct.unpack_from(endian + "Q", table, i * size + 48)[0]
                    if alignment < 16384:
                        elf_alignment.append((entry.filename, alignment))
                        break
    print(f"{path}: {path.stat().st_size} bytes; {libraries} ARM64 libraries")
    print(f"Uncompressed ARM64 ZIP entries below 16-KiB alignment: {len(zip_alignment)}")
    for name in zip_alignment:
        print(" ZIP:", name)
    print(f"ARM64 ELF libraries below 16-KiB segment alignment: {len(elf_alignment)}")
    for name, alignment in elf_alignment:
        print(" ELF:", name, alignment)
    if not libraries:
        raise ValueError("APK has no ARM64 libraries")


if __name__ == "__main__":
    for argument in sys.argv[1:]:
        inspect(argument)
