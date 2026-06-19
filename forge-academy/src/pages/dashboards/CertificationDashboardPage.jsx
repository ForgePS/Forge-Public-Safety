import { useEffect, useState } from "react";
import PageHeader, { StatCard } from "../../components/PageHeader.jsx";
import PortalAnnouncementsPanel from "../../components/PortalAnnouncementsPanel.jsx";
import { PORTAL_AUDIENCES } from "../../lib/portalAnnouncements.js";
import {
  listPendingStudentCertifications,
  listRenewalDueCertifications,
  listStudentCertifications,
} from "../../lib/studentCertifications.js";

export default function CertificationDashboardPage() {
  const [stats, setStats] = useState({ pending: 0, renewals: 0, active: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listPendingStudentCertifications(),
      listRenewalDueCertifications(),
      listStudentCertifications(),
    ])
      .then(([pending, renewals, all]) => {
        setStats({
          pending: pending.length,
          renewals: renewals.length,
          active: all.filter((item) => item.status === "active").length,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader title="Certification Officer Dashboard" subtitle="Issuance and renewals" />
      <div className="flex flex-1 flex-col gap-5 p-6 lg:p-7">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Certs Pending Review"
            value={loading ? "…" : stats.pending}
            sub="Awaiting officer approval"
            warn={stats.pending > 0}
          />
          <StatCard
            label="Renewals Due"
            value={loading ? "…" : stats.renewals}
            sub="Expiring or expired credentials"
            warn={stats.renewals > 0}
          />
          <StatCard
            label="Active Certifications"
            value={loading ? "…" : stats.active}
            sub="Currently valid statewide"
          />
        </div>
        <PortalAnnouncementsPanel audience={PORTAL_AUDIENCES.CERTIFICATION} className="max-w-xl" />
      </div>
    </>
  );
}
