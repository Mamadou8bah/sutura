package com.mamadou.sutura.notification;

import com.mamadou.sutura.common.Exception.InvalidTokenException;
import com.mamadou.sutura.notification.service.EmailSender;
import com.mamadou.sutura.notification.service.TwoFactorDeliveryService;
import com.mamadou.sutura.user.entity.User;
import com.mamadou.sutura.user.enums.Role;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EmailLoginOtpTest {
  @Test void everyRoleReceivesTheCodeAtItsEmailAddress() {
    for (Role role : Role.values()) {
      EmailSender email = mock(EmailSender.class);
      var delivery = new TwoFactorDeliveryService(email);
      var user = User.builder().role(role).email("test@example.invalid")
          .phoneNumber("+2207000001").build();
      delivery.sendCode(user, "123456");
      verify(email).send(eq("test@example.invalid"), anyString(), contains("123456"));
      verifyNoMoreInteractions(email);
    }
  }

  @Test void missingEmailCannotFallBackToSms() {
    EmailSender email = mock(EmailSender.class);
    var delivery = new TwoFactorDeliveryService(email);
    for (String address : new String[] {null, "", " "}) {
      var user = User.builder().role(Role.USER).email(address)
          .phoneNumber("+2207000001").build();
      assertThrows(InvalidTokenException.class, () -> delivery.sendCode(user, "123456"));
    }
    verifyNoInteractions(email);
  }
}
