package com.mamadou.sutura.deployment;

import static org.junit.jupiter.api.Assertions.*;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@EnabledIfEnvironmentVariable(
    named = "DEPLOYMENT_TEST_DATABASE_URL",
    matches = "jdbc:postgresql:.*")
@SpringBootTest(
    properties = {
      "spring.flyway.enabled=true",
      "spring.jpa.hibernate.ddl-auto=validate",
      "spring.datasource.driver-class-name=org.postgresql.Driver",
      "sutura.payments.approved-payout-recovery-enabled=false"
    })
@ActiveProfiles("test")
class PostgresMigrationTest {
  @DynamicPropertySource
  static void database(DynamicPropertyRegistry properties) {
    String url = System.getenv("DEPLOYMENT_TEST_DATABASE_URL");
    java.net.URI uri = java.net.URI.create(url.substring(5));
    if (!java.util.Set.of("localhost", "127.0.0.1").contains(uri.getHost())
        || !uri.getPath().endsWith("_deployment_test"))
      throw new IllegalArgumentException(
          "Migration test requires a local disposable database ending in _deployment_test");
    properties.add("spring.datasource.url", () -> url);
    properties.add(
        "spring.datasource.username",
        () -> System.getenv().getOrDefault("DEPLOYMENT_TEST_DATABASE_USER", "validation"));
    properties.add(
        "spring.datasource.password",
        () -> System.getenv().getOrDefault("DEPLOYMENT_TEST_DATABASE_PASSWORD", ""));
  }

  @Autowired javax.sql.DataSource source;
  @Autowired Flyway flyway;
  @Autowired org.springframework.jdbc.core.JdbcTemplate jdbc;

  @Test
  void existingSchemaRequiresExplicitAdoptionAndPreservesRecords() throws Exception {
    String schema = "adoption_test_" + java.util.UUID.randomUUID().toString().replace("-", "");
    var initial =
        Flyway.configure()
            .dataSource(source)
            .schemas(schema)
            .defaultSchema(schema)
            .target("1")
            .load();
    initial.migrate();
    try (var connection = source.getConnection();
        var statement = connection.createStatement()) {
      statement.execute(
          "insert into "
              + schema
              + ".sentinel_webhook_receipts(id,payload_hash,processed_at) values"
              + " ('preserved-test-receipt','test-hash',current_timestamp)");
      statement.execute("drop table " + schema + ".flyway_schema_history");
      var adoption =
          Flyway.configure()
              .dataSource(source)
              .schemas(schema)
              .defaultSchema(schema)
              .baselineVersion("1")
              .load();
      assertThrows(org.flywaydb.core.api.FlywayException.class, adoption::migrate);
      adoption.baseline();
      assertEquals(15, adoption.migrate().migrationsExecuted);
      try (var result =
          statement.executeQuery(
              "select count(*) from "
                  + schema
                  + ".sentinel_webhook_receipts where id='preserved-test-receipt'")) {
        result.next();
        assertEquals(1, result.getInt(1));
      }
      assertEquals(0, adoption.migrate().migrationsExecuted);
    } finally {
      // The schema name is generated above and belongs exclusively to this disposable test.
      try (var connection = source.getConnection();
          var statement = connection.createStatement()) {
        statement.execute("drop schema " + schema + " cascade");
      }
    }
  }

  @Test
  void freshDatabaseMigratesAndHibernateValidates() {
    assertEquals("16", flyway.info().current().getVersion().toString());
    assertEquals(0, flyway.migrate().migrationsExecuted);
    assertTrue(
        jdbc.queryForObject(
                "select count(*) from information_schema.tables where table_schema='public' and"
                    + " table_name='users'",
                Integer.class)
            > 0);
  }
}
