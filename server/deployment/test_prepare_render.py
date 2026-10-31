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
        self.assertEqual(b["SPRING_DATASOURCE_PASSWORD"], "")
        self.assertNotIn("POSTGRES_PASSWORD", b)
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

    def test_migrates_legacy_database_without_losing_credentials(self):
        values = {"RENDER_DB_HOST": "db.internal", "RENDER_DB_NAME": "sutura",
                  "POSTGRES_USER": "owner", "POSTGRES_PASSWORD": "private-fixture"}
        module.migrate_database(values)
        self.assertEqual(values["SPRING_DATASOURCE_URL"], "jdbc:postgresql://db.internal:5432/sutura")
        self.assertEqual(values["SPRING_DATASOURCE_USERNAME"], "owner")
        self.assertEqual(values["SPRING_DATASOURCE_PASSWORD"], "private-fixture")
        self.assertNotIn("POSTGRES_PASSWORD", values)
        a, b = module.prepare(self.sutura, self.sentinel)
        a["SPRING_DATASOURCE_URL"] = "postgresql://user:private-fixture@db.internal/sutura"
        report = "\n".join(module.check(a, b))
        self.assertIn("must use jdbc:postgresql://", report)
        self.assertNotIn("private-fixture", report)

    def test_extracts_jdbc_credentials_and_preserves_tls_options(self):
        values = {"SPRING_DATASOURCE_URL":
            "jdbc:postgresql://db.internal/sutura?user=owner&password=private%2Bfixture&sslmode=require&channelBinding=require"}
        module.normalize_datasource(values)
        self.assertEqual(values["SPRING_DATASOURCE_USERNAME"], "owner")
        self.assertEqual(values["SPRING_DATASOURCE_PASSWORD"], "private+fixture")
        self.assertEqual(values["SPRING_DATASOURCE_URL"],
            "jdbc:postgresql://db.internal/sutura?sslmode=require&channelBinding=require")
        module.normalize_datasource(values)
        self.assertEqual(values["SPRING_DATASOURCE_PASSWORD"], "private+fixture")

    def test_disconnected_sentinel_and_empty_browser_origins_do_not_block_deployment(self):
        a, b = module.prepare(self.sutura, self.sentinel)
        a.update(SUTURA_SENTINEL_CONNECTED="false", SUTURA_SENTINEL_BASE_URL="", SUTURA_CORS_ALLOWED_ORIGINS="")
        report = "\n".join(module.check(a, b))
        self.assertNotIn("fill SUTURA_SENTINEL_BASE_URL", report)
        self.assertNotIn("SUTURA_CORS_ALLOWED_ORIGINS", report)
        a["SUTURA_SENTINEL_CONNECTED"] = "true"
        self.assertIn("fill SUTURA_SENTINEL_BASE_URL", "\n".join(module.check(a, b)))

    def test_deferred_payments_do_not_require_a_provider_key(self):
        a, b = module.prepare(self.sutura, self.sentinel)
        a["MODEMPAY_ENABLED"] = "false"
        a["MODEMPAY_API_KEY"] = ""
        self.assertNotIn("fill MODEMPAY_API_KEY", "\n".join(module.check(a, b)))
        a["MODEMPAY_ENABLED"] = "true"
        self.assertIn("fill MODEMPAY_API_KEY", "\n".join(module.check(a, b)))

    def test_never_overwrites_conflicting_datasource_credentials(self):
        values = {"SPRING_DATASOURCE_URL": "postgresql://owner:private@db.internal/sutura",
                  "SPRING_DATASOURCE_PASSWORD": "existing-private"}
        with self.assertRaises(ValueError):
            module.normalize_datasource(values)
        self.assertEqual(values["SPRING_DATASOURCE_PASSWORD"], "existing-private")


if __name__ == "__main__":
    unittest.main()
