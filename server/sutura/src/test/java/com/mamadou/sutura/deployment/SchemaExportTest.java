package com.mamadou.sutura.deployment;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/** Developer-only DDL export. Never regenerate an already deployed Flyway version. */
@EnabledIfSystemProperty(named = "sutura.export-schema", matches = "true")
@SpringBootTest(
    properties = {
      "spring.jpa.hibernate.ddl-auto=none",
      "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect",
      "spring.jpa.properties.jakarta.persistence.schema-generation.database.action=none",
      "spring.jpa.properties.jakarta.persistence.schema-generation.scripts.action=create",
      "spring.jpa.properties.jakarta.persistence.schema-generation.scripts.create-target=target/postgres-schema.sql",
      "spring.jpa.properties.hibernate.hbm2ddl.schema-generation.script.append=false",
      "sutura.payments.approved-payout-recovery-enabled=false"
    })
@ActiveProfiles("test")
class SchemaExportTest {
  @Test
  void export() {
    org.junit.jupiter.api.Assertions.assertTrue(
        java.nio.file.Files.exists(java.nio.file.Path.of("target/postgres-schema.sql")));
  }
}
