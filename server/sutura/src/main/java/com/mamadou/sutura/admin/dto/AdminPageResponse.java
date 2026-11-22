package com.mamadou.sutura.admin.dto;

import java.util.List;
import org.springframework.data.domain.Page;

/** Stable JSON shape compatible with the admin web client's existing pagination. */
public record AdminPageResponse<T>(List<T> content, int number, int size,
        int totalPages, long totalElements) {
    public static <T> AdminPageResponse<T> from(Page<T> page) {
        return new AdminPageResponse<>(page.getContent(),page.getNumber(),page.getSize(),page.getTotalPages(),page.getTotalElements());
    }
}
