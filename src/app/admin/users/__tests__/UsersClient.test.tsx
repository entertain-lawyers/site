/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Role } from '@prisma/client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock('@/modules/admin/admin-user.actions', () => ({
  createUserAction: vi.fn(),
  deleteUserAction: vi.fn(),
}));

import UsersClient, { AdminUserRow } from '../UsersClient';

describe('UsersClient Avatar & User List', () => {
  const usersWithGoogleAvatars: AdminUserRow[] = [
    {
      id: 'user-google-1',
      email: 'bhumipangeni49@gmail.com',
      name: 'Bhumi Pangeni',
      image: 'https://lh3.googleusercontent.com/a/ACg8ocL6VGEpLU6nEwRNI4HM5lGIq7ETnrc5oulZ2TXZKYxLcGpIdA=s96-c',
      nickname: 'bhumi',
      role: Role.USER,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-no-avatar',
      email: 'nikhilkumarchaudhary07@gmail.com',
      name: null,
      image: null,
      nickname: null,
      role: Role.USER,
      createdAt: new Date().toISOString(),
    },
  ];

  it('renders Google profile avatar with referrerPolicy="no-referrer"', () => {
    const html = renderToStaticMarkup(
      <UsersClient initialUsers={usersWithGoogleAvatars} currentUserId="admin-user-id" />
    );

    expect(html).toContain('https://lh3.googleusercontent.com/a/ACg8ocL6VGEpLU6nEwRNI4HM5lGIq7ETnrc5oulZ2TXZKYxLcGpIdA=s96-c');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).toContain('bhumipangeni49@gmail.com');
  });

  it('renders initials fallback when user has no image', () => {
    const html = renderToStaticMarkup(
      <UsersClient initialUsers={usersWithGoogleAvatars} currentUserId="admin-user-id" />
    );

    expect(html).toContain('nikhilkumarchaudhary07@gmail.com');
    // First letter of email 'n' capitalized -> 'N'
    expect(html).toContain('>N</span>');
  });
});
