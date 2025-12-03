'use client';

/**
 * Example: Refactored Site Creation Form
 * Using FormWrapper template + validation schemas
 */

import { FormWrapper } from '@/components/templates/FormWrapper';
import { createSiteSchema } from '@/lib/validation/schemas';
import { useRouter } from 'next/navigation';

export default function NewSitePage() {
  const router = useRouter();

  return (
    <FormWrapper
      title="Create Site"
      description="Add a new site to your organization"
      schema={createSiteSchema}
      fields={[
        { name: 'site_name', label: 'Site Name', type: 'text', required: true, placeholder: 'Enter site name' },
        { name: 'address_line_1', label: 'Address Line 1', type: 'text', required: true },
        { name: 'address_line_2', label: 'Address Line 2', type: 'text' },
        { name: 'city', label: 'City', type: 'text', required: true },
        { name: 'postcode', label: 'Postcode', type: 'text', required: true },
        { name: 'country', label: 'Country', type: 'text', required: true },
        { 
          name: 'regulator', 
          label: 'Regulator', 
          type: 'select', 
          required: true,
          options: [
            { value: 'EA', label: 'Environment Agency' },
            { value: 'SEPA', label: 'SEPA' },
            { value: 'NRW', label: 'Natural Resources Wales' },
            { value: 'NIEA', label: 'NIEA' }
          ]
        },
        { name: 'water_company', label: 'Water Company', type: 'text' },
      ]}
      apiEndpoint="/sites"
      method="POST"
      backLink="/dashboard"
      onSuccess={(data) => {
        router.push('/dashboard/sites/' + data.data.id);
      }}
      submitLabel="Create Site"
    />
  );
}
