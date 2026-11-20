package com.mamadou.sutura.agent;

import com.mamadou.sutura.agent.controller.AgentController;
import com.mamadou.sutura.agent.service.AgentOperationService;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AgentCustomerLookupTest {
    private final UserRepository users = mock(UserRepository.class);
    private final AgentController controller = new AgentController(mock(AgentOperationService.class), users, mock(com.mamadou.sutura.agent.service.CashOutQrService.class));

    @Test void lookupReturnsOnlyCustomerIdentity() {
        User customer = User.builder().id(42).firstName("Test").lastName("Customer").enabled(true).build();
        when(users.findByPhoneNumber("+2201234567")).thenReturn(Optional.of(customer));
        var result = controller.customer("+2201234567").getBody();
        assertNotNull(result);
        assertEquals(42, result.id());
        assertEquals("Test Customer", result.name());
    }

    @Test void invalidPhoneNeverQueriesDirectory() {
        assertThrows(ResponseStatusException.class, () -> controller.customer("invalid"));
        verifyNoInteractions(users);
    }

    @Test void disabledAndLockedCustomersAreUnavailable() {
        User customer = User.builder().enabled(false).build();
        when(users.findByPhoneNumber("+2201234567")).thenReturn(Optional.of(customer));
        assertThrows(ResponseStatusException.class, () -> controller.customer("+2201234567"));
        customer.setEnabled(true);
        customer.setLockedAt(java.time.LocalDateTime.now());
        assertThrows(ResponseStatusException.class, () -> controller.customer("+2201234567"));
    }
}
