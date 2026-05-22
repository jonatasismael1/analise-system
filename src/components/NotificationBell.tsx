import { useState, useEffect, useRef } from "react";
import { Bell, Check, ExternalLink } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export interface Notificacao {
  id: string;
  tipo: string;
  mensagem: string;
  link?: string;
  lida: boolean;
  criada_em: string;
}

export function NotificationBell({ clinicaId }: { clinicaId: string }) {
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  // Canal único por instância — evita erro ao montar dois NotificationBells simultaneamente
  const channelName = useRef(`notif-${clinicaId}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!clinicaId) return;

    const loadNotifications = async () => {
      const { data } = await supabase
        .from("notificacoes")
        .select("*")
        .eq("clinica_id", clinicaId)
        .order("criada_em", { ascending: false })
        .limit(20);

      if (data) setNotifications(data);
    };

    void loadNotifications();

    const channel = supabase
      .channel(channelName.current)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificacoes',
        filter: `clinica_id=eq.${clinicaId}`
      }, (payload: any) => {
        setNotifications(prev => [payload.new as Notificacao, ...prev]);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notificacoes',
        filter: `clinica_id=eq.${clinicaId}`
      }, (payload: any) => {
        setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new as Notificacao : n));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [clinicaId]);

  const unreadCount = notifications.filter(n => !n.lida).length;

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.lida).map(n => n.id);
    if (unreadIds.length === 0) return;

    setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
    await supabase.from("notificacoes").update({ lida: true }).in("id", unreadIds);
  };

  return (
    <div className="relative">
      <button 
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-secondary hover:bg-surface-container-low hover:text-primary transition"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-error ring-2 ring-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-surface-variant bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="flex items-center justify-between border-b border-surface-variant p-4">
            <h3 className="font-semibold text-on-surface">Notificações</h3>
            {unreadCount > 0 && (
              <button 
                className="text-xs text-primary hover:text-primary-dark font-medium"
                onClick={markAllAsRead}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-secondary">Nenhuma notificação</p>
            ) : (
              <ul className="divide-y divide-surface-variant">
                {notifications.map((n) => (
                  <li key={n.id} className={`p-4 transition ${n.lida ? 'opacity-70 bg-white' : 'bg-teal-50/30'}`}>
                    <p className={`text-sm ${n.lida ? 'text-secondary' : 'text-on-surface font-medium'}`}>
                      {n.mensagem}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-secondary uppercase tracking-wider">
                        {new Date(n.criada_em).toLocaleDateString('pt-BR')}
                      </span>
                      <div className="flex items-center gap-2">
                        {n.link && (
                          <a href={n.link} className="flex items-center gap-1 text-xs text-primary hover:underline">
                            Acessar <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        {!n.lida && (
                          <button 
                            className="flex items-center gap-1 text-xs text-secondary hover:text-primary"
                            onClick={() => markAsRead(n.id)}
                            title="Marcar como lida"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
