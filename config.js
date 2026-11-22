// Configuración de la base de datos (Supabase).
// La clave "anon" es pública por diseño: solo permite llamar a las funciones de supabase/schema.sql.
// Si se dejan vacíos, la app funciona en MODO DEMO (datos de ejemplo guardados solo en este navegador).
window.RDC_CONFIG = {
  supabaseUrl: "https://xzrxdtwscpkzhhtaxjkq.supabase.co",
  // clave pública de las notificaciones (la privada solo está en Supabase)
  vapidPublicKey: "BFJddHYU8dwuIMrvD__SHFvHK9cFOqroa-Psd6C2UsCyqsOVOv4E7aQE7NVLwjowtysBYnAar6wSOLx0jle2FpA",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6cnhkdHdzY3BremhodGF4amtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUyOTcxMjAsImV4cCI6MjExMDg3MzEyMH0.tbYmLLY0CyBJRmer7NAr7OQD3wujhiUxTu0GMO6Gap8"
};
