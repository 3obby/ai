import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | GroupChatBotBuilder",
  description: "Privacy Policy for GroupChatBotBuilder"
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container max-w-4xl mx-auto py-12 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Privacy Policy</h1>
      
      <div className="space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Introduction</h2>
          <p>
            This Privacy Policy describes how GroupChatBotBuilder ("we," "us," or "our") collects, uses, and shares your personal information when you use our website and services.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Information We Collect</h2>
          <p>
            We may collect personal information such as your name, email address, and usage data. This information is collected when you create an account, use our services, or communicate with us.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">3. How We Use Your Information</h2>
          <p>
            We use your information to provide and improve our services, communicate with you, and comply with legal obligations. We may also use your information for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Data Sharing and Disclosure</h2>
          <p>
            We may share your information with service providers, partners, and other third parties as necessary to provide our services or as required by law.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Data Security</h2>
          <p>
            We implement reasonable security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is completely secure.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Your Rights</h2>
          <p>
            Depending on your location, you may have rights regarding your personal information, such as the right to access, correct, or delete your data.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at support@groupchatbotbuilder.com.
          </p>
        </section>

        <div className="text-sm text-center pt-8 border-t border-border">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
} 