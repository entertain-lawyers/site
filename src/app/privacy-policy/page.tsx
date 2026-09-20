import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - Entertain Lawyers',
  description: 'Privacy Policy for Entertain Lawyers platform.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12">
          
          <div className="mb-10 border-b border-gray-100 pb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-600 text-lg leading-relaxed">
              Entertain Lawyers Pvt. Ltd. is committed to protecting your privacy. This privacy policy outlines how we collect, use, and protect your personal information when you use our platform.
            </p>
            <p className="text-sm text-gray-400 mt-4">Last updated: September 18, 2026</p>
          </div>

          <div className="space-y-10 text-gray-700">
            
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information Collection</h2>
              <div className="space-y-3 leading-relaxed">
                <p>
                  We collect information that you provide directly to us when you create an account, subscribe to our services, or communicate with us. This may include your name, email address, payment details, and educational information.
                </p>
                <p>
                  Additionally, we automatically collect certain data about your device and how you interact with our platform, such as your IP address, browser type, pages visited, and access times, to improve our services and monitor for security.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Use of Information</h2>
              <div className="space-y-3 leading-relaxed">
                <p>
                  The information we collect is primarily used to provide, maintain, and improve the Entertain Lawyers platform. Specifically, we use your data to:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-gray-600">
                  <li>Process transactions and manage your subscriptions or purchases.</li>
                  <li>Verify your identity and maintain the security of your account.</li>
                  <li>Provide customer support and respond to your requests or inquiries.</li>
                  <li>Communicate with you about updates, new resources, and platform changes.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Data Security</h2>
              <div className="space-y-3 leading-relaxed">
                <p>
                  We implement robust security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. All sensitive data, such as payment information, is processed securely through industry-standard payment gateways.
                </p>
                <p>
                  However, please note that no method of transmission over the internet or electronic storage is completely secure. While we strive to protect your data, we cannot guarantee its absolute security.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Contact Information</h2>
              <div className="space-y-3 leading-relaxed">
                <p>
                  If you have any questions or concerns regarding this Privacy Policy or our data practices, please feel free to reach out to our team.
                </p>
                <p>
                  <strong>Email:</strong> support@entertainlawyers.com<br />
                  <strong>Address:</strong> Kathmandu, Nepal
                </p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
