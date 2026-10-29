import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("prepare_render", Path(__file__).with_name("prepare-render.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class RenderPreparationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.sutura = Path(self.temp.name) / "sutura"
        self.sentinel = Path(self.temp.name) / "sentinel"
        (self.sutura / "server").mkdir(parents=True)
        self.sentinel.mkdir()
        (self.sutura / "server/.env.example").write_text(
            'SUTURA_SENTINEL_TENANT_CODE=sutura\nJOKOOR_API_KEY=\n', encoding="utf-8")
        (self.sentinel / ".env.example").write_text(
            'SENTINEL_BOOTSTRAP_TENANT_CODE=sutura\nSENTINEL_ML_ENABLED=true\n'
            'JWT_SECRET=local-demo-key\nPOSTGRES_PASSWORD=local-demo-password\n'
            'VITE_API_BASE_URL=http://localhost:8080\n', encoding="utf-8")
        (self.sutura / "server/.env").write_text('JOKOOR_API_KEY=sk_live_private_fixture\n', encoding="utf-8")

    def test_generated_secrets_match_and_never_rotate_on_rerun(self):
        first = module.prepare(self.sutura, self.sentinel)
        second = module.prepare(self.sutura, self.sentinel)
        self.assertEqual(first, second)
        a, b = first
        self.assertEqual(a["SUTURA_SENTINEL_API_KEY"], b["SENTINEL_BOOTSTRAP_API_KEY"])
        self.assertEqual(a["SUTURA_SENTINEL_WEBHOOK_SECRET"], b["SENTINEL_BOOTSTRAP_WEBHOOK_SECRET"])
        self.assertNotEqual(a["JWT_SECRET"], b["JWT_SECRET"])
        self.assertNotEqual(b["JWT_SECRET"], "local-demo-key")
        self.assertEqual(b["POSTGRES_PASSWORD"], "")
        self.assertNotIn("VITE_API_BASE_URL", b)
        self.assertEqual(b["SENTINEL_ML_ENABLED"], "false")
        self.assertEqual(a["JOKOOR_API_KEY"], "sk_live_private_fixture")
        self.assertGreaterEqual(len(a["SUTURA_SENTINEL_API_KEY"]), 32)

    def test_rejects_conflicting_existing_credentials_before_writing(self):
        a, b = module.prepare(self.sutura, self.sentinel)
        b["SENTINEL_BOOTSTRAP_API_KEY"] = "different-private-fixture"
        report = "\n".join(module.check(a, b))
        self.assertIn("Integration mismatch", report)
        self.assertNotIn("different-private-fixture", report)
        module.write_env(self.sentinel / ".env.render", b)
        before = (self.sutura / "server/.env.render").read_bytes()
        with self.assertRaises(ValueError):
            module.prepare(self.sutura, self.sentinel)
        self.assertEqual(before, (self.sutura / "server/.env.render").read_bytes())

    def test_reports_names_without_exposing_secrets_and_can_defer_ml(self):
        a, b = module.prepare(self.sutura, self.sentinel)
        report = "\n".join(module.check(a, b))
        self.assertNotIn("private_fixture", report)
        self.assertNotIn("fill CV_ML_BASE_URL", report)
        b["SENTINEL_ML_ENABLED"] = "true"
        self.assertIn("fill CV_ML_BASE_URL", "\n".join(module.check(a, b)))

    def test_rejects_example_origins_and_links_the_exact_callback(self):
        with self.assertRaises(ValueError):
            module.origin("https://app.example.com")
        a, b = module.prepare(self.sutura, self.sentinel,
            "https://suturagambia.onrender.com", "https://sentinel-live.onrender.com")
        self.assertEqual(a["SUTURA_SENTINEL_BASE_URL"], "https://sentinel-live.onrender.com")
        self.assertEqual(b["SENTINEL_BOOTSTRAP_WEBHOOK_URL"],
                         "https://suturagambia.onrender.com/api/v1/webhooks/sentinel")


if __name__ == "__main__":
    unittest.main()
