import { supabase } from "./supabaseClient";

export async function requestPushPermission(clinicaId: string, userId: string) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  
  // VAPID public key would go here in a real implementation
  // const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  // const subscription = await registration.pushManager.subscribe({
  //   userVisibleOnly: true,
  //   applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
  // });

  // For the MVP, we just create a dummy subscription to satisfy the table schema
  const dummyEndpoint = "https://fcm.googleapis.com/fcm/send/dummy-" + Date.now();
  
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert({
      clinica_id: clinicaId,
      user_id: userId,
      endpoint: dummyEndpoint,
      p256dh: "dummy_p256dh",
      auth: "dummy_auth",
      tipos: ["consultas_nao_confirmadas", "pagamentos_vencendo", "pacientes_inativos"]
    }, { onConflict: "endpoint" });

  if (error) {
    console.error("Erro ao salvar inscrição push:", error);
    return false;
  }

  return true;
}

export async function unsubscribePush(endpoint: string) {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
    
  if (error) {
    console.error("Erro ao remover inscrição push:", error);
    return false;
  }
  
  return true;
}
