import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
}

interface UserRole {
  role: 'EXPEDIÇÃO' | 'GALPÃO' | 'GESTOR';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: 'EXPEDIÇÃO' | 'GALPÃO' | 'GESTOR' | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<'EXPEDIÇÃO' | 'GALPÃO' | 'GESTOR' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch profile and role
          setTimeout(async () => {
            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            
            if (profileError) {
              console.error('Error fetching profile:', profileError);
              toast.error('Erro ao carregar perfil');
              setLoading(false);
              return;
            }
            
            setProfile(profileData);
            
            // Fetch role from user_roles table
            const { data: roleData, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
            
            if (roleError) {
              console.error('Error fetching role:', roleError);
              toast.error('Erro ao carregar permissões');
            } else {
              setRole(roleData.role);
            }
            
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Fetch profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (error) {
              console.error('Error fetching profile:', error);
              setLoading(false);
              return;
            }
            setProfile(data);
            
            // Fetch role from user_roles table
            supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single()
              .then(({ data: roleData, error: roleError }) => {
                if (roleError) {
                  console.error('Error fetching role:', roleError);
                } else {
                  setRole(roleData.role);
                }
                setLoading(false);
              });
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erro ao fazer logout');
    } else {
      toast.success('Logout realizado com sucesso');
      navigate('/auth');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
