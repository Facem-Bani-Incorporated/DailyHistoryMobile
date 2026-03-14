// context/LanguageContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

export type Language = "en" | "ro" | "fr" | "de" | "es";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void; // intentionally sync — triggers re-render immediately
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────

const translations: Record<Language, Record<string, string>> = {
  en: {
    Daily: "Daily",
    History: "History",
    today: "Today",
    history: "History",
    discover: "Discover",
    profile_title: "Profile",
    retry: "Retry",
    no_content: "Nothing here",
    empty_today_desc: "No historical events found for today. Tap retry to reload.",
    empty_day_desc: "No historical events found for this day.",
    only_one_today: "Only one event today",
    featured: "Featured",
    more_today: "More from today",
    share_message: "Check out this historical moment: ",
    tap_for_story: "Tap for Story",
    impact: "Impact",
    significance: "Significance",
    score: "Impact Score",
    close: "Close",
    read_story: "Read story",
    appearance: "Appearance",
    language: "Language",
    sign_out: "Sign Out",
    status: "Status",
    role: "Role",
    active: "Active",
    preferences: "Preferences",
    account: "Account",
    sign_in_method: "Sign in method",
    welcome_headline: "Discover History\nEvery Day",
    get_started: "Get Started",
    login: "Log In",
    register: "Register",
    email: "Email Address",
    password: "Password",
    username: "Username",
    notif_title: "Don't Miss History",
    notif_desc: "Get a daily notification about what happened today in the past.",
    allow_notif: "Allow Notifications",
    skip: "Maybe later",
    HISTORY: "History", WAR: "War", ART: "Art", SCIENCE: "Science",
    POLITICS: "Politics", EXPLORATION: "Exploration", CULTURE: "Culture",
    RELIGION: "Religion", ECONOMICS: "Economics", SPORTS: "Sports",
    TECHNOLOGY: "Technology", NATURE: "Nature",
    war: "War", art: "Art", science: "Science", politics: "Politics",
    exploration: "Exploration", culture: "Culture", religion: "Religion",
    economics: "Economics", sports: "Sports", technology: "Technology",
    nature: "Nature",
  },
  ro: {
    Daily: "Daily",
    History: "History",
    today: "Astăzi",
    history: "Istorie",
    discover: "Descoperă",
    profile_title: "Profil",
    retry: "Reîncearcă",
    no_content: "Nimic aici",
    empty_today_desc: "Nu am găsit evenimente istorice pentru astăzi. Apasă reîncearcă.",
    empty_day_desc: "Nu există evenimente istorice pentru această zi.",
    only_one_today: "Doar un eveniment astăzi",
    featured: "Recomandat",
    more_today: "Mai mult din ziua aceasta",
    share_message: "Descoperă acest moment istoric: ",
    tap_for_story: "Atinge pentru Poveste",
    impact: "Impact",
    significance: "Semnificație",
    score: "Scor Impact",
    close: "Închide",
    read_story: "Citește povestea",
    appearance: "Aspect",
    language: "Limbă",
    sign_out: "Deconectare",
    status: "Status",
    role: "Rol",
    active: "Activ",
    preferences: "Preferințe",
    account: "Cont",
    sign_in_method: "Metodă de autentificare",
    welcome_headline: "Descoperă Istoria\nÎn Fiecare Zi",
    get_started: "Începe Acum",
    login: "Autentificare",
    register: "Înregistrare",
    email: "Adresă Email",
    password: "Parolă",
    username: "Nume utilizator",
    notif_title: "Nu Rata Istoria",
    notif_desc: "Primește o notificare zilnică despre ce s-a întâmplat astăzi în trecut.",
    allow_notif: "Permite Notificările",
    skip: "Mai târziu",
    HISTORY: "Istorie", WAR: "Război", ART: "Artă", SCIENCE: "Știință",
    POLITICS: "Politică", EXPLORATION: "Explorare", CULTURE: "Cultură",
    RELIGION: "Religie", ECONOMICS: "Economie", SPORTS: "Sport",
    TECHNOLOGY: "Tehnologie", NATURE: "Natură",
    war: "Război", art: "Artă", science: "Știință", politics: "Politică",
    exploration: "Explorare", culture: "Cultură", religion: "Religie",
    economics: "Economie", sports: "Sport", technology: "Tehnologie",
    nature: "Natură",
  },
  fr: {
    Daily: "Daily",
    History: "History",
    today: "Aujourd'hui",
    history: "Histoire",
    discover: "Découvrir",
    profile_title: "Profil",
    retry: "Réessayer",
    no_content: "Rien ici",
    empty_today_desc: "Aucun événement historique trouvé pour aujourd'hui.",
    empty_day_desc: "Aucun événement historique trouvé pour ce jour.",
    only_one_today: "Un seul événement aujourd'hui",
    featured: "À la une",
    more_today: "Plus d'aujourd'hui",
    share_message: "Découvrez ce moment historique : ",
    tap_for_story: "Appuyez pour l'histoire",
    impact: "Impact",
    significance: "Signification",
    score: "Score d'impact",
    close: "Fermer",
    read_story: "Lire l'histoire",
    appearance: "Apparence",
    language: "Langue",
    sign_out: "Déconnexion",
    status: "Statut",
    role: "Rôle",
    active: "Actif",
    preferences: "Préférences",
    account: "Compte",
    sign_in_method: "Méthode de connexion",
    welcome_headline: "Découvrez l'Histoire\nChaque Jour",
    get_started: "Commencer",
    login: "Connexion",
    register: "S'inscrire",
    email: "E-mail",
    password: "Mot de passe",
    username: "Nom d'utilisateur",
    notif_title: "Ne manquez pas l'histoire",
    notif_desc: "Recevez une notification quotidienne sur ce qui s'est passé aujourd'hui.",
    allow_notif: "Autoriser les notifications",
    skip: "Plus tard",
    HISTORY: "Histoire", WAR: "Guerre", ART: "Art", SCIENCE: "Science",
    POLITICS: "Politique", EXPLORATION: "Exploration", CULTURE: "Culture",
    RELIGION: "Religion", ECONOMICS: "Économie", SPORTS: "Sport",
    TECHNOLOGY: "Technologie", NATURE: "Nature",
    war: "Guerre", art: "Art", science: "Science", politics: "Politique",
    exploration: "Exploration", culture: "Culture", religion: "Religion",
    economics: "Économie", sports: "Sport", technology: "Technologie",
    nature: "Nature",
  },
  de: {
    Daily: "Daily",
    History: "History",
    today: "Heute",
    history: "Geschichte",
    discover: "Entdecken",
    profile_title: "Profil",
    retry: "Erneut versuchen",
    no_content: "Nichts hier",
    empty_today_desc: "Keine historischen Ereignisse für heute gefunden.",
    empty_day_desc: "Keine historischen Ereignisse für diesen Tag.",
    only_one_today: "Nur ein Ereignis heute",
    featured: "Empfohlen",
    more_today: "Mehr von heute",
    share_message: "Sieh dir diesen historischen Moment an: ",
    tap_for_story: "Tippen für Geschichte",
    impact: "Einfluss",
    significance: "Bedeutung",
    score: "Einfluss-Wert",
    close: "Schließen",
    read_story: "Geschichte lesen",
    appearance: "Aussehen",
    language: "Sprache",
    sign_out: "Abmelden",
    status: "Status",
    role: "Rolle",
    active: "Aktiv",
    preferences: "Einstellungen",
    account: "Konto",
    sign_in_method: "Anmeldemethode",
    welcome_headline: "Entdecke die Geschichte\njeden Tag",
    get_started: "Jetzt starten",
    login: "Anmelden",
    register: "Registrieren",
    email: "E-Mail-Adresse",
    password: "Passwort",
    username: "Benutzername",
    notif_title: "Geschichte nicht verpassen",
    notif_desc: "Tägliche Benachrichtigung über Ereignisse in der Vergangenheit.",
    allow_notif: "Benachrichtigungen erlauben",
    skip: "Vielleicht später",
    HISTORY: "Geschichte", WAR: "Krieg", ART: "Kunst", SCIENCE: "Wissenschaft",
    POLITICS: "Politik", EXPLORATION: "Entdeckung", CULTURE: "Kultur",
    RELIGION: "Religion", ECONOMICS: "Wirtschaft", SPORTS: "Sport",
    TECHNOLOGY: "Technologie", NATURE: "Natur",
    war: "Krieg", art: "Kunst", science: "Wissenschaft", politics: "Politik",
    exploration: "Entdeckung", culture: "Kultur", religion: "Religion",
    economics: "Wirtschaft", sports: "Sport", technology: "Technologie",
    nature: "Natur",
  },
  es: {
    Daily: "Daily",
    History: "History",
    today: "Hoy",
    history: "Historia",
    discover: "Descubrir",
    profile_title: "Perfil",
    retry: "Reintentar",
    no_content: "Nada aquí",
    empty_today_desc: "No se encontraron eventos históricos para hoy.",
    empty_day_desc: "No se encontraron eventos históricos para este día.",
    only_one_today: "Solo un evento hoy",
    featured: "Destacado",
    more_today: "Más de hoy",
    share_message: "Echa un vistazo a este momento histórico: ",
    tap_for_story: "Toca para la historia",
    impact: "Impacto",
    significance: "Significado",
    score: "Puntuación de impacto",
    close: "Cerrar",
    read_story: "Leer historia",
    appearance: "Apariencia",
    language: "Idioma",
    sign_out: "Cerrar Sesión",
    status: "Estado",
    role: "Rol",
    active: "Activo",
    preferences: "Preferencias",
    account: "Cuenta",
    sign_in_method: "Método de inicio de sesión",
    welcome_headline: "Descubre la Historia\nCada Día",
    get_started: "Empezar",
    login: "Iniciar Sesión",
    register: "Registrarse",
    email: "Correo electrónico",
    password: "Contraseña",
    username: "Nombre de usuario",
    notif_title: "No te pierdas la historia",
    notif_desc: "Recibe una notificación diaria sobre lo que pasó hoy en el pasado.",
    allow_notif: "Permitir notificaciones",
    skip: "Más tarde",
    HISTORY: "Historia", WAR: "Guerra", ART: "Arte", SCIENCE: "Ciencia",
    POLITICS: "Política", EXPLORATION: "Exploración", CULTURE: "Cultura",
    RELIGION: "Religión", ECONOMICS: "Economía", SPORTS: "Deporte",
    TECHNOLOGY: "Tecnología", NATURE: "Naturaleza",
    war: "Guerra", art: "Arte", science: "Ciencia", politics: "Política",
    exploration: "Exploración", culture: "Cultura", religion: "Religión",
    economics: "Economía", sports: "Deporte", technology: "Tecnología",
    nature: "Naturaleza",
  },
};

// ─── PROVIDER ─────────────────────────────────────────────────────────────────

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("en");

  // Load persisted language once on mount
  useEffect(() => {
    AsyncStorage.getItem("app_language")
      .then((stored) => {
        if (stored && ["en", "ro", "fr", "de", "es"].includes(stored)) {
          setLanguageState(stored as Language);
        }
      })
      .catch(() => {});
  }, []);

  /**
   * SYNC state update → triggers immediate React re-render across the whole tree.
   * AsyncStorage write happens fire-and-forget in the background.
   */
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);                           // instant re-render
    AsyncStorage.setItem("app_language", lang).catch(() => {}); // persist silently
  }, []);

  /**
   * Lookup order:
   * 1. exact key  ("today", "WAR", "Daily")
   * 2. UPPERCASE  ("war" → "WAR")
   * 3. lowercase  ("WAR" → "war")
   * 4. original key as fallback
   */
  const t = useCallback(
    (key: string): string => {
      const table = translations[language];
      return (
        table[key] ??
        table[key.toUpperCase()] ??
        table[key.toLowerCase()] ??
        key
      );
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);