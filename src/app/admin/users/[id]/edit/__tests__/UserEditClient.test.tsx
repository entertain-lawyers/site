/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Role } from '@prisma/client';

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock('@/components/admin/ImageUpload', () => ({
  default: () => <div data-testid="image-upload">Image Upload Mock</div>,
}));

const mockUpdateUserAction = vi.fn();
vi.mock('@/modules/admin/admin-user.actions', () => ({
  updateUserAction: (args: any) => mockUpdateUserAction(args),
}));

import UserEditClient from '../UserEditClient';
import { getActionErrorMessage, isServerActionNotFoundError, STALE_ACTION_ERROR_MESSAGE } from '@/lib/client-action-utils';

describe('UserEditClient component', () => {
  const baseUser = {
    id: 'user-123',
    email: 'testuser@example.com',
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    nickname: 'tester',
    bio: 'A brief bio',
    website: 'https://example.com',
    image: null,
    role: Role.EDITOR,
    wpAuthorIdEn: 10,
    wpAuthorIdNe: 20,
  };

  const wpAuthors = {
    en: [
      { id: 10, name: 'English Author 10' },
      { id: 11, name: 'English Author 11' },
    ],
    enError: null,
    ne: [
      { id: 20, name: 'Nepali Author 20' },
      { id: 21, name: 'Nepali Author 21' },
    ],
    neError: null,
  };

  const displayOptions = ['Test User', 'Test', 'User', 'testuser'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all sections and initial values correctly', () => {
    const html = renderToStaticMarkup(
      <UserEditClient
        user={baseUser}
        displayOptions={displayOptions}
        wpAuthors={wpAuthors}
      />
    );

    expect(html).toContain('Names');
    expect(html).toContain('Account Management');
    expect(html).toContain('Content Author Profiles');
    expect(html).toContain('Contact Info');
    expect(html).toContain('About');
    expect(html).toContain('value="testuser@example.com"');
    expect(html).toContain('value="Test"');
    expect(html).toContain('value="User"');
    expect(html).toContain('value="tester"');
    expect(html).toContain('English Author 10 (#10)');
    expect(html).toContain('Nepali Author 20 (#20)');
    expect(html).toContain('Update User');
  });

  it('protects main admin role change', () => {
    const html = renderToStaticMarkup(
      <UserEditClient
        user={{ ...baseUser, email: 'admin@entertainlawyers.com', role: Role.ADMIN }}
        displayOptions={displayOptions}
        wpAuthors={wpAuthors}
      />
    );

    expect(html).toContain('The main admin role cannot be changed.');
    expect(html).toContain('disabled=""');
  });

  it('shows warning when user role is regular USER for WordPress author accounts', () => {
    const html = renderToStaticMarkup(
      <UserEditClient
        user={{ ...baseUser, role: Role.USER }}
        displayOptions={displayOptions}
        wpAuthors={wpAuthors}
      />
    );

    expect(html).toContain('This user currently has the regular');
    expect(html).toContain('Content authors must be an');
  });

  it('displays WordPress author API error if present', () => {
    const html = renderToStaticMarkup(
      <UserEditClient
        user={baseUser}
        displayOptions={displayOptions}
        wpAuthors={{
          ...wpAuthors,
          enError: 'Failed to connect to English WordPress API',
        }}
      />
    );

    expect(html).toContain('Failed to connect to English WordPress API');
  });

  describe('Server Action error handling and version skew resilience', () => {
    it('detects and translates the observed Server Action not found error', () => {
      const observedError = new Error('Server Action "7f03c3fdc95c135d16f0744cfee483f47c116cafd" was not found on the server.');
      
      expect(isServerActionNotFoundError(observedError)).toBe(true);
      const friendlyMessage = getActionErrorMessage(observedError, 'Failed to update user');
      expect(friendlyMessage).toBe(STALE_ACTION_ERROR_MESSAGE);
      expect(friendlyMessage).not.toContain('7f03c3fdc95c135d16f0744cfee483f47c116cafd');
    });

    it('preserves genuine user-facing update errors without prompting reload', () => {
      const emailError = new Error('User with this email already exists');
      expect(isServerActionNotFoundError(emailError)).toBe(false);
      expect(getActionErrorMessage(emailError, 'Failed to update user')).toBe('User with this email already exists');

      const passwordError = new Error('Password must be at least 8 characters');
      expect(isServerActionNotFoundError(passwordError)).toBe(false);
      expect(getActionErrorMessage(passwordError, 'Failed to update user')).toBe('Password must be at least 8 characters');

      const authorError = new Error('English WordPress author #10 is already mapped to another user.');
      expect(isServerActionNotFoundError(authorError)).toBe(false);
      expect(getActionErrorMessage(authorError, 'Failed to update user')).toBe('English WordPress author #10 is already mapped to another user.');
    });
  });
});
