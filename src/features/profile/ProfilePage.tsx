import { Clock, Mail, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { blocksConfig } from "../../lib/blocks/config";
import { useT } from "../../lib/i18n/LocalizationProvider";
import { formatDateTime, formatTime } from "../../lib/i18n/dictionary";
import { ActionButton } from "../../shared/ui/ActionButton";
import { ChipList } from "../../shared/ui/Chip";
import { JsonPanel } from "../../shared/ui/JsonPanel";
import { PageHeader } from "../../shared/ui/PageHeader";
import { Skeleton } from "../../shared/ui/Skeleton";
import { StatusPill } from "../../shared/ui/StatusPill";
import {
  useCurrentUser,
  userDisplayName,
  userInitials,
} from "./useCurrentUser";

export function ProfilePage() {
  const me = useCurrentUser();
  const { claims } = useAuth();
  const { t, language } = useT();
  const profile = me.data?.data;
  const name = userDisplayName(profile);
  const issuedAt =
    typeof claims?.iat === "number"
      ? new Date((claims.iat as number) * 1000)
      : undefined;
  const expiresAt =
    typeof claims?.exp === "number"
      ? new Date((claims.exp as number) * 1000)
      : undefined;

  return (
    <section>
      <PageHeader
        title={t("profile.title")}
        subtitle={t("profile.subtitle")}
        actions={
          <ActionButton
            variant="icon"
            onClick={() => me.refetch()}
            title={t("profile.refresh")}
            icon={<RefreshCw size={18} />}
          />
        }
      />

      {me.isLoading ? (
        <div className="profile-card">
          <Skeleton className="skeleton-avatar-lg" />
          <div className="profile-heading">
            <Skeleton className="skeleton-line-lg" />
            <Skeleton className="skeleton-line" />
          </div>
        </div>
      ) : (
        <div className="profile-card">
          <span className="avatar avatar-lg">{userInitials(profile)}</span>
          <div className="profile-heading">
            <h3>
              {name || (me.isError ? t("profile.status.unavailable") : t("profile.unknownUser"))}
            </h3>
            {profile?.email ? (
              <span className="muted">
                <Mail size={14} /> {profile.email}
              </span>
            ) : null}
            <StatusPill tone={me.isSuccess ? "good" : "warn"}>
              {me.isSuccess ? t("profile.status.authenticated") : t("profile.status.unavailable")}
            </StatusPill>
          </div>
        </div>
      )}

      <div className="grid">
        <DetailCard
          icon={<UserRound size={16} />}
          label={t("profile.userId")}
          loading={me.isLoading}
          value={profile?.itemId}
        />
        <DetailCard
          icon={<ShieldCheck size={16} />}
          label={t("profile.tenantId")}
          value={blocksConfig.xBlocksKey}
        />
        <DetailCard
          icon={<Clock size={16} />}
          label={t("profile.sessionExpires")}
          value={formatDateTime(expiresAt, language)}
        />
      </div>

      <div className="panel">
        <div className="panel-title">
          <ShieldCheck size={16} />
          <span>{t("profile.roles")}</span>
        </div>
        {me.isLoading ? (
          <Skeleton className="skeleton-line" />
        ) : (
          <ChipList empty={t("profile.roles.empty")} items={profile?.roles} />
        )}
      </div>

      <div className="panel">
        <div className="panel-title">
          <ShieldCheck size={16} />
          <span>{t("profile.permissions", { values: { count: profile?.permissions?.length ?? 0 } })}</span>
        </div>
        {me.isLoading ? (
          <Skeleton className="skeleton-line" />
        ) : (
          <ChipList
            empty={t("profile.permissions.empty")}
            items={profile?.permissions}
          />
        )}
      </div>

      <div className="panel">
        <div className="panel-title">
          <Clock size={16} />
          <span>{t("profile.session")}</span>
        </div>
        <div className="chips">
          <span className="chip">
            {issuedAt
              ? t("profile.session.signedIn", { values: { time: formatTime(issuedAt, language) } })
              : t("profile.session.signedIn", { values: { time: t("common.unknown") } })}
          </span>
          <span className="chip">
            {expiresAt
              ? t("profile.session.expires", { values: { time: formatTime(expiresAt, language) } })
              : t("profile.session.expires", { values: { time: t("common.unknown") } })}
          </span>
        </div>
      </div>

      <details className="raw-details">
        <summary>{t("profile.raw.toggle")}</summary>
        <JsonPanel value={profile ?? me.error ?? me.data} />
      </details>
    </section>
  );
}

function DetailCard({
  icon,
  label,
  loading,
  value,
}: {
  icon: ReactNode;
  label: string;
  loading?: boolean;
  value?: string;
}) {
  const { t } = useT();
  return (
    <div className="panel">
      <div className="panel-title">
        {icon}
        <span>{label}</span>
      </div>
      {loading ? (
        <Skeleton className="skeleton-line" />
      ) : (
        <strong className="mono">{value || t("common.notAvailable")}</strong>
      )}
    </div>
  );
}