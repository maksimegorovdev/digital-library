import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FileText } from 'lucide-react';

import { NavDocuments } from '@/components/nav-documents';
import { SidebarProvider } from '@/components/ui/sidebar';

const items = [{ title: 'Текстовый помощник', icon: FileText }];

describe('NavDocuments', () => {
  it('renders the section label and every item as a disabled, non-functional button', () => {
    render(
      <SidebarProvider>
        <NavDocuments items={items} />
      </SidebarProvider>,
    );

    expect(screen.getByText('Документы')).toBeInTheDocument();

    const button = screen.getByText('Текстовый помощник').closest('button');
    expect(button).toBeDisabled();

    // Non-functional placeholders never register as links.
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
