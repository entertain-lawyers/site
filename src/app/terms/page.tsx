import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Entertain Lawyers platform.',
  alternates: { canonical: '/terms' },
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12">
          
          <div className="mb-10 border-b border-gray-100 pb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
              <p className="text-amber-800 text-sm font-medium">
                <strong>DRAFT STATUS:</strong> The following terms are provided as a structural placeholder for the Entertain Lawyers platform. They have not been legally reviewed and do not constitute a binding legal agreement. A finalized, legally reviewed Terms of Service document will be published prior to full commercial operation.
              </p>
            </div>
            <p className="text-gray-600 text-lg leading-relaxed">
              These placeholder terms outline the general conditions regarding your use of the Entertain Lawyers platform.
            </p>
            <p className="text-sm text-gray-400 mt-4">Draft created: October 2026 (Pending Review)</p>
          </div>

          <div className="space-y-10 text-gray-700">
            
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <div className="space-y-3 leading-relaxed">
                <p>
                  By accessing the website at entertainlawyers.com, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Use License</h2>
              <div className="space-y-3 leading-relaxed">
                <p>
                  Permission is granted to temporarily download one copy of the materials (information or software) on Entertain Lawyers' website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.
                </p>
                <p>
                  Under this license, you may not modify or copy the materials, use them for any commercial purpose, or attempt to decompile or reverse engineer any software contained on the website.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Disclaimer</h2>
              <div className="space-y-3 leading-relaxed">
                <p>
                  The materials on Entertain Lawyers' website are provided on an 'as is' basis. Entertain Lawyers makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                </p>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
