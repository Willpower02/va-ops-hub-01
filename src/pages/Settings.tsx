import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function SettingsPage() {
  const { userName, userEmail, role, can, profile, orgId, session } = useAuth();
  const { data: sub } = useSubscription();
  const navigate = useNavigate();
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  // Profile state
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Org state
  const [orgName, setOrgName] = useState('');
  const [orgSaving, setOrgSaving] = useState(false);

  useEffect(() => {
    setFirstName(profile?.first_name || '');
    setLastName(profile?.last_name || '');
  }, [profile]);

  useEffect(() => {
    if (can('manageOrg') && orgId) {
      supabase.from('organizations').select('name').eq('id', orgId).single().then(({ data }) => {
        if (data) setOrgName(data.name);
      });
    }
  }, [orgId, can]);

  const handleProfileSave = async () => {
    if (!session) return;
    setProfileSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ first_name: firstName.trim(), last_name: lastName.trim(), updated_at: new Date().toISOString() })
      .eq('id', session.user.id);
    setProfileSaving(false);
    if (error) {
      toast.error(error.message || 'Failed to update profile');
    } else {
      toast.success('Profile updated');
    }
  };

  const handlePasswordUpdate = async () => {
    setPasswordError('');
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) {
      setPasswordError(error.message || 'Failed to update password');
    } else {
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated');
    }
  };

  const handleOrgSave = async () => {
    if (!orgId || !orgName.trim()) return;
    setOrgSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({ name: orgName.trim() })
      .eq('id', orgId);
    setOrgSaving(false);
    if (error) {
      toast.error(error.message || 'Failed to update organization');
    } else {
      toast.success('Organization updated');
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* Profile Settings */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Profile Settings</h3>
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg glow-border">
            {initials}
          </div>
          <div>
            <Badge className="capitalize bg-primary/20 text-primary border-0">{role?.replace('_', ' ')}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-muted-foreground">First Name</Label>
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="bg-secondary/50 border-border/50" />
          </div>
          <div>
            <Label className="text-muted-foreground">Last Name</Label>
            <Input value={lastName} onChange={e => setLastName(e.target.value)} className="bg-secondary/50 border-border/50" />
          </div>
        </div>
        <div>
          <Label className="text-muted-foreground">Email</Label>
          <Input value={userEmail || ''} readOnly className="bg-secondary/50 border-border/50 opacity-60 cursor-not-allowed" />
        </div>
        <Button onClick={handleProfileSave} disabled={profileSaving} className="bg-primary hover:bg-primary/90">
          {profileSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Change Password */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Change Password</h3>
        {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
        <div>
          <Label className="text-muted-foreground">New Password</Label>
          <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" className="bg-secondary/50 border-border/50" />
        </div>
        <div>
          <Label className="text-muted-foreground">Confirm New Password</Label>
          <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className="bg-secondary/50 border-border/50" />
        </div>
        <Button onClick={handlePasswordUpdate} disabled={passwordSaving} className="bg-primary hover:bg-primary/90">
          {passwordSaving ? 'Updating...' : 'Update Password'}
        </Button>
      </div>

      {/* Organization Settings (admin only) */}
      {can('manageOrg') && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Organization Settings</h3>
          <div>
            <Label className="text-muted-foreground">Organization Name</Label>
            <Input value={orgName} onChange={e => setOrgName(e.target.value)} className="bg-secondary/50 border-border/50" />
          </div>
          <Button onClick={handleOrgSave} disabled={orgSaving} className="bg-primary hover:bg-primary/90">
            {orgSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      )}

      {/* Account */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Account</h3>
        <Button variant="outline" onClick={() => supabase.auth.signOut()} className="border-border/50 hover:bg-secondary">Sign Out</Button>
        <Separator className="bg-border/30" />
        <div>
          <h3 className="font-semibold text-foreground mb-2">About</h3>
          <p className="text-sm text-muted-foreground">VA Tracker — Live Operations Dashboard v2.0</p>
          <p className="text-sm text-muted-foreground">Connected to Lovable Cloud</p>
        </div>
      </div>
    </div>
  );
}
