package com.mamadou.sutura;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@EnableAsync
@SpringBootApplication
public class SuturaApplication {

  public static void main(String[] args) {
    boolean recovery = java.util.Arrays.asList(args).contains("--recover-staff");
    if (recovery || java.util.Arrays.asList(args).contains("--bootstrap-admin")) {
      SpringApplication application = new SpringApplication(SuturaApplication.class);
      application.setAdditionalProfiles(recovery ? "recover-staff" : "bootstrap-admin");
      String[] commandArgs =
          java.util.stream.Stream.concat(
                  java.util.Arrays.stream(args)
                      .filter(a -> !a.equals("--bootstrap-admin") && !a.equals("--recover-staff")),
                  java.util.stream.Stream.of(
                      "--server.port=0", "--sutura.scheduling.enabled=false"))
              .toArray(String[]::new);
      try (var context = application.run(commandArgs)) {
        if (recovery)
          context.getBean(com.mamadou.sutura.admin.service.StaffAccountRecovery.class).recover();
        else
          context
              .getBean(com.mamadou.sutura.admin.service.InitialAdminProvisioner.class)
              .provision();
      }
    } else SpringApplication.run(SuturaApplication.class, args);
  }
}
