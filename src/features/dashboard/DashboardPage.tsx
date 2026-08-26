import { Boxes, CheckCircle2, ExternalLink, KeyRound, Languages, Server, ShieldCheck, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { useNavigate } from "../../app/providers/NavigationContext";
import { blocksConfig, isBlocksConfigured, isLoginConfigured } from "../../lib/blocks/config";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { formatTime } from "../../lib/i18n/dictionary";
import { PageHeader } from "../../shared/ui/PageHeader";
import { StatusPill } from "../../shared/ui/StatusPill";

const checks = [
  { labelKey: "dashboard.check.apiUrl", value: blocksConfig.apiUrl, icon: Server },
  { labelKey: "dashboard.check.tenantId", value: blocksConfig.xBlocksKey, icon: KeyRound },
  { labelKey: "dashboard.check.appDomain", value: blocksConfig.appDomain, icon: ExternalLink }
];

export function DashboardPage() {
  const { claims, status } = useAuth();
  const { t, language } = useT();
  const navigate = useNavigate();
  const ready = isBlocksConfigured();
  const loginReady = isLoginConfigured();
  const expiresAt = typeof claims?.exp === "number" ? new Date((claims.exp as number) * 1000) : undefined;

  return (
    <section>
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
        actions={
          <StatusPill tone={ready ? "good" : "warn"}>
            {ready ? t("dashboard.status.ready") : t("dashboard.status.configNeeded")}
          </StatusPill>
        }
      />
      <div className="metrics">
        <Metric
          label={t("dashboard.metric.cloud.label")}
          value={ready ? t("dashboard.metric.cloud.value.ready") : t("dashboard.metric.cloud.value.pending")}
          detail={t("dashboard.metric.cloud.detail")}
        />
        <Metric
          label={t("dashboard.metric.session.label")}
          value={status === "authenticated" ? t("dashboard.metric.session.value.signedIn") : t("dashboard.metric.session.value.signedOut")}
          detail={
            expiresAt
              ? t("dashboard.metric.session.detail.expires", { values: { time: formatTime(expiresAt, language) } })
              : t("dashboard.metric.session.detail.oidc")
          }
        />
        <Metric
          label={t("dashboard.metric.iam.label")}
          value={t("dashboard.metric.iam.value")}
          detail={t("dashboard.metric.iam.detail")}
        />
      </div>
      <div className="grid">
        {checks.map((item) => (
          <Info
            key={item.labelKey}
            label={t(item.labelKey)}
            value={item.value}
            icon={<item.icon size={18} />}
          />
        ))}
      </div>
      <div className="section-band">
        <div><UserRound size={22} /><h3>{t("dashboard.userAndProfile.heading")}</h3></div>
        <p>{t("dashboard.userAndProfile.body")}</p>
      </div>
      <div className="panel">
        <div className="panel-title">{t("dashboard.nextSteps.heading")}</div>
        <ul className="next-steps">
          <li>
            <ShieldCheck size={18} />
            <span>
              {loginReady
                ? t("dashboard.nextSteps.oidcConfigured")
                : t("dashboard.nextSteps.oidcUnconfigured")}
            </span>
          </li>
          <li>
            <Boxes size={18} />
            <span>{t("dashboard.nextSteps.assetsHint")}</span>
          </li>
          <li>
            <Languages size={18} />
            <span>{t("dashboard.nextSteps.localizationHint")}</span>
          </li>
          <li>
            <button className="link-button" onClick={() => navigate("/audit")}>Open the API audit page →</button>
          </li>
          <li>
            <button className="link-button" onClick={() => navigate("/playwright")}>Open the Playwright runner →</button>
          </li>
          <li>
            <button className="link-button" onClick={() => navigate("/repo-browser")}>Open the repo browser →</button>
          </li>
        </ul>
      </div>
    </section>
  );
}

function Metric({ detail, label, value }: { detail: string; label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  const { t } = useT();
  return (
    <div className="panel">
      <div className="panel-title">{icon}<span>{label}</span></div>
      <strong>{value || t("dashboard.info.notConfigured")}</strong>
      <CheckCircle2 className="panel-mark" size={18} />
    </div>
  );
}