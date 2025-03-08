import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | GroupChatBotBuilder",
  description: "Terms of Service for GroupChatBotBuilder"
};

export default function TermsOfServicePage() {
  return (
    <div className="container max-w-4xl mx-auto py-12 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Terms of Service</h1>
      
      <div className="space-y-6 text-muted-foreground">
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using GroupChatBotBuilder, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">2. Use License</h2>
          <p>
            Permission is granted to temporarily use the materials on GroupChatBotBuilder's website for personal, non-commercial purposes only. This is the grant of a license, not a transfer of title.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">3. User Accounts</h2>
          <p>
            To access certain features of the service, you may be required to create an account. You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">4. Prohibited Activities</h2>
          <p>
            You may not engage in any activity that interferes with or disrupts the service or servers and networks connected to the service. You may not attempt to gain unauthorized access to any portion of the service.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">5. Disclaimer</h2>
          <p>
            The materials on GroupChatBotBuilder's website are provided on an 'as is' basis. GroupChatBotBuilder makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">6. Limitations</h2>
          <p>
            In no event shall GroupChatBotBuilder or its suppliers be liable for any damages arising out of the use or inability to use the materials on GroupChatBotBuilder's website.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">7. Revisions and Errata</h2>
          <p>
            The materials appearing on GroupChatBotBuilder's website may include technical, typographical, or photographic errors. GroupChatBotBuilder does not warrant that any of the materials on its website are accurate, complete, or current.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4 text-foreground">8. Governing Law</h2>
          <p>
            These Terms of Service shall be governed by and construed in accordance with the laws of the jurisdiction in which GroupChatBotBuilder operates, without regard to its conflict of law provisions.
          </p>
        </section>

        <div className="text-sm text-center pt-8 border-t border-border">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
} 