import { content } from "../data/loadContent.js";

export default function LegalPage({ title, children }) {
  return (
    <div className="bg-black py-20">
      <div className="max-w-3xl mx-auto px-6 lg:px-8">
        <h1 className="text-4xl font-black text-white mb-2">{title}</h1>
        <p className="text-sm text-[#64748B] mb-10">Last updated: June 1, 2026</p>
        <div className="space-y-8 text-[#94A3B8] leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
      {children}
    </section>
  );
}

export function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <Section title="Information We Collect">
        <p>We collect information you provide directly to us, such as when you create an account, request a demo, or contact our support team. This includes name, email address, phone number, agency name, and role.</p>
      </Section>
      <Section title="How We Use Your Information">
        <p>We use the information we collect to provide, maintain, and improve the Forge platform; process transactions; send technical notices and support messages; and respond to your comments and questions.</p>
      </Section>
      <Section title="Data Security">
        <p>Forge uses industry-standard encryption (AES-256 at rest, TLS 1.3 in transit) for agency data. Access to customer data is strictly controlled and audited.</p>
      </Section>
      <Section title="Contact Us">
        <p>If you have questions about this Privacy Policy, contact us at {content.site.privacyEmail}.</p>
      </Section>
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <Section title="Use of the Platform">
        <p>Forge Public Safety provides software services to public safety agencies subject to these terms and any applicable order or agreement with your agency.</p>
      </Section>
      <Section title="Agency Responsibilities">
        <p>Agencies are responsible for maintaining the confidentiality of account credentials and for ensuring that use of the platform complies with applicable laws and policies.</p>
      </Section>
      <Section title="Changes">
        <p>We may update these terms from time to time. Material changes will be communicated to account administrators in advance when possible.</p>
      </Section>
    </LegalPage>
  );
}

export function SecurityPage() {
  return (
    <LegalPage title="Security">
      <Section title="Platform Security">
        <p>Forge is designed for public safety workloads with encrypted transport, role-based access, audit logging, and tenant isolation between agency platforms.</p>
      </Section>
      <Section title="Operational Practices">
        <p>We follow secure development practices, monitor platform availability, and restrict administrative access to authorized personnel.</p>
      </Section>
      <Section title="Report a concern">
        <p>Security questions or vulnerability reports can be sent to {content.site.securityEmail}.</p>
      </Section>
    </LegalPage>
  );
}
