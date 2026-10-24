package com.mamadou.sutura.admin.service;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

/** First-deploy provisioning for free Render, which has no service shell. */
@Component
@Profile("render-free")
@ConditionalOnProperty(name = "sutura.bootstrap.enabled", havingValue = "true")
public class RenderAdminBootstrap implements ApplicationRunner {
  private final InitialAdminProvisioner provisioner;

  public RenderAdminBootstrap(InitialAdminProvisioner provisioner) {
    this.provisioner = provisioner;
  }

  @Override
  public void run(ApplicationArguments args) {
    provisioner.provisionIfAbsent();
  }
}
