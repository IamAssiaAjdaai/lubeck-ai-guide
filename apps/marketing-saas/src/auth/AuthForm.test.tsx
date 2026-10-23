import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuthForm from './AuthForm';
import { api, ApiFailure } from '../api';
vi.mock('../api', async importOriginal => ({...await importOriginal<typeof import('../api')>(),api:vi.fn()}));
const request=vi.mocked(api);
beforeEach(()=>{history.replaceState(null,'','/auth');request.mockReset();});afterEach(cleanup);
const form=()=>screen.getByRole('button',{name:'Anmelden'}).closest('form')!;
describe('active authentication UX',()=>{
 it('exposes a labeled password toggle, retains input and resets visibility/input between views',()=>{
  render(<AuthForm onSignedIn={vi.fn()}/>);const password=screen.getByLabelText('Passwort') as HTMLInputElement;
  fireEvent.change(password,{target:{value:'synthetic-password'}});fireEvent.click(screen.getByRole('button',{name:'Passwort anzeigen'}));
  expect(password.type).toBe('text');expect(password.value).toBe('synthetic-password');expect(screen.getByRole('button',{name:'Passwort verbergen'}).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(screen.getByRole('button',{name:'Passwort vergessen?'}));fireEvent.click(screen.getByRole('button',{name:'Zur Anmeldung'}));
  expect((screen.getByLabelText('Passwort') as HTMLInputElement).type).toBe('password');expect((screen.getByLabelText('Passwort') as HTMLInputElement).value).toBe('');
 });
 it('focuses and associates inline errors; invalid input never reaches the API',()=>{
  render(<AuthForm onSignedIn={vi.fn()}/>);fireEvent.change(screen.getByLabelText('E-Mail-Adresse'),{target:{value:'bad'}});fireEvent.submit(form());
  expect(request).not.toHaveBeenCalled();const email=screen.getByLabelText('E-Mail-Adresse');expect(email.getAttribute('aria-invalid')).toBe('true');expect(document.activeElement).toBe(email);
  expect(document.getElementById(email.getAttribute('aria-describedby')!)?.textContent).toContain('gültige E-Mail');expect(screen.getByLabelText('Passwort').getAttribute('aria-invalid')).toBe('true');
 });
 it.each(['INVALID_TOKEN','TOKEN_EXPIRED','token_expired'])('shows safe recovery for %s without automatically submitting or reopening signup',code=>{
  history.replaceState(null,'','/auth?error='+code);render(<AuthForm onSignedIn={vi.fn()}/>);
  expect(screen.getByRole('heading',{name:'Dieser Link ist nicht mehr gültig.'})).toBeTruthy();expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Neuen Passwort-Link anfordern'}));expect(screen.getByRole('heading',{name:'Passwort vergessen?'})).toBeTruthy();expect(location.search).toBe('');
  expect(screen.queryByText('Neues Konto erstellen')).toBeNull();
 });
 it('handles server-invalid reset tokens without signing in and removes the token from the URL',async()=>{
  history.replaceState(null,'','/auth?token=synthetic-invalid');request.mockRejectedValue(new ApiFailure('invalid','INVALID_TOKEN'));const signedIn=vi.fn();
  render(<AuthForm onSignedIn={signedIn}/>);fireEvent.change(screen.getByLabelText('Passwort'),{target:{value:'Synthetic-password-2026!'}});fireEvent.click(screen.getByRole('button',{name:'Passwort speichern'}));
  await screen.findByRole('heading',{name:'Dieser Link ist nicht mehr gültig.'});expect(signedIn).not.toHaveBeenCalled();expect(location.search).toBe('');
 });
 it('keeps signin policy and unknown-account reset responses generic',async()=>{
  request.mockResolvedValue({});render(<AuthForm onSignedIn={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Passwort vergessen?'}));fireEvent.change(screen.getByLabelText('E-Mail-Adresse'),{target:{value:'  EXAMPLE@example.test  '}});fireEvent.click(screen.getByRole('button',{name:'Link anfordern'}));
  await waitFor(()=>expect(request).toHaveBeenCalledWith('/api/auth/request-password-reset',expect.objectContaining({email:'example@example.test'})));
  expect(await screen.findByRole('status')).toHaveProperty('textContent',expect.stringContaining('Falls ein Konto existiert'));
 });
});
