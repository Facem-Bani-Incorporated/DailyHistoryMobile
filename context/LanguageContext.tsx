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
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

const translations: Record<Language, Record<string, string>> = {
  en: {
    Daily: "Daily", History: "History", today: "Today", tomorrow: "Tomorrow",
    history: "History", discover: "Discover", timeline: "Timeline", map: "Map",
    saved: "Saved", retry: "Retry", no_content: "Nothing here",
    empty_today_desc: "No historical events found for today. Tap retry to reload.",
    empty_day_desc: "No historical events found for this day.",
    only_one_today: "Only one event today", featured: "Featured",
    more_today: "More from today", share_message: "Check out this historical moment: ",
    tap_for_story: "Tap for Story", impact: "Impact", significance: "Significance",
    score: "Impact Score", close: "Close", read_story: "Read story",
    profile_title: "Profile", your_stats: "Your Stats", current_streak: "Streak",
    best_streak: "Best", stories_read: "Read", achievements: "Awards",
    streak_bonus: "streak bonus", xp_today: "XP today", appearance: "Appearance",
    language: "Language", preferences: "Preferences", notifications: "Notifications",
    on: "On", off: "Off", account: "Account", sign_in_method: "Sign in method",
    sign_out: "Sign Out", contact_support: "Contact Support",
    contact_support_desc: "Bug reports, questions, suggestions", rate_app: "Rate Daily History",
    rate_app_desc: "Help us grow with a review", share_app: "Share with friends",
    share_app_desc: "Spread the love of history", active: "Active", status: "Status",
    role: "Role", welcome_headline: "Discover History\nEvery Day", get_started: "Get Started",
    login: "Log In", register: "Register", email: "Email Address", password: "Password",
    username: "Username", notif_title: "Don't Miss History",
    notif_desc: "Get a daily notification about what happened today in the past.",
    allow_notif: "Allow Notifications", skip: "Maybe later",
    HISTORY: "History", WAR: "War", ART: "Art", SCIENCE: "Science",
    POLITICS: "Politics", EXPLORATION: "Exploration", CULTURE: "Culture",
    RELIGION: "Religion", ECONOMICS: "Economics", SPORTS: "Sports",
    TECHNOLOGY: "Technology", NATURE: "Nature", war: "War", art: "Art",
    science: "Science", politics: "Politics", exploration: "Exploration",
    culture: "Culture", religion: "Religion", economics: "Economics",
    sports: "Sports", technology: "Technology", nature: "Nature",
    calendar_hint: "Select a date to explore its history",
    // LEADERBOARD
    leaderboard: "Leaderboard", your_rank: "YOUR RANK",
    no_users_found: "No users found.", level: "Level"
  },

  ro: {
    Daily: "Daily", History: "History", today: "Astăzi", tomorrow: "Mâine",
    history: "Istorie", discover: "Descoperă", timeline: "Cronologie", map: "Hartă",
    saved: "Salvate", retry: "Reîncearcă", no_content: "Nimic aici",
    empty_today_desc: "Nu am găsit evenimente istorice pentru astăzi. Apasă reîncearcă.",
    empty_day_desc: "Nu există evenimente istorice pentru această zi.",
    only_one_today: "Doar un eveniment astăzi", featured: "Recomandat",
    more_today: "Mai mult din ziua aceasta", share_message: "Descoperă acest moment istoric: ",
    tap_for_story: "Atinge pentru Poveste", impact: "Impact", significance: "Semnificație",
    score: "Scor Impact", close: "Închide", read_story: "Citește povestea",
    profile_title: "Profil", your_stats: "Statisticile Tale", current_streak: "Serie",
    best_streak: "Record", stories_read: "Citite", achievements: "Premii",
    streak_bonus: "bonus serie", xp_today: "XP astăzi", appearance: "Aspect",
    language: "Limbă", preferences: "Preferințe", notifications: "Notificări",
    on: "Activat", off: "Dezactivat", account: "Cont", sign_in_method: "Metodă de autentificare",
    sign_out: "Deconectare", contact_support: "Contactează Suportul",
    contact_support_desc: "Rapoarte de bug, întrebări, sugestii", rate_app: "Evaluează Daily History",
    rate_app_desc: "Ajută-ne să creștem cu o recenzie", share_app: "Împărtășește cu prietenii",
    share_app_desc: "Răspândește dragostea pentru istorie", active: "Activ", status: "Status",
    role: "Rol", welcome_headline: "Descoperă Istoria\nÎn Fiecare Zi", get_started: "Începe Acum",
    login: "Autentificare", register: "Înregistrare", email: "Adresă Email", password: "Parolă",
    username: "Nume utilizator", notif_title: "Nu Rata Istoria",
    notif_desc: "Primește o notificare zilnică despre ce s-a întâmplat astăzi în trecut.",
    allow_notif: "Permite Notificările", skip: "Mai târziu",
    HISTORY: "Istorie", WAR: "Război", ART: "Artă", SCIENCE: "Știință",
    POLITICS: "Politică", EXPLORATION: "Explorare", CULTURE: "Cultură",
    RELIGION: "Religie", ECONOMICS: "Economie", SPORTS: "Sport",
    TECHNOLOGY: "Tehnologie", NATURE: "Natură", war: "Război", art: "Artă",
    science: "Știință", politics: "Politică", exploration: "Explorare",
    culture: "Cultură", religion: "Religie", economics: "Economie",
    sports: "Sport", technology: "Tehnologie", nature: "Natură",
    calendar_hint: "Alege o dată pentru a-i explora istoria",
    // LEADERBOARD
    leaderboard: "Clasament", your_rank: "LOCUL TĂU",
    no_users_found: "Nu există utilizatori momentan.", level: "Nivel"
  },

  fr: {
    Daily: "Daily", History: "History", today: "Aujourd'hui", tomorrow: "Demain",
    history: "Histoire", discover: "Découvrir", timeline: "Chronologie", map: "Carte",
    saved: "Sauvegardés", retry: "Réessayer", no_content: "Rien ici",
    empty_today_desc: "Aucun événement historique trouvé pour aujourd'hui.",
    empty_day_desc: "Aucun événement historique trouvé pour ce jour.",
    only_one_today: "Un seul événement aujourd'hui", featured: "À la une",
    more_today: "Plus d'aujourd'hui", share_message: "Découvrez ce moment historique : ",
    tap_for_story: "Appuyez pour l'histoire", impact: "Impact", significance: "Signification",
    score: "Score d'impact", close: "Fermer", read_story: "Lire l'histoire",
    profile_title: "Profil", your_stats: "Vos Statistiques", current_streak: "Série",
    best_streak: "Record", stories_read: "Lues", achievements: "Récompenses",
    streak_bonus: "bonus de série", xp_today: "XP aujourd'hui", appearance: "Apparence",
    language: "Langue", preferences: "Préférences", notifications: "Notifications",
    on: "Activé", off: "Désactivé", account: "Compte", sign_in_method: "Méthode de connexion",
    sign_out: "Déconnexion", contact_support: "Contacter le Support",
    contact_support_desc: "Rapports de bugs, questions, suggestions", rate_app: "Évaluer Daily History",
    rate_app_desc: "Aidez-nous à grandir avec un avis", share_app: "Partager avec des amis",
    share_app_desc: "Partagez l'amour de l'histoire", active: "Actif", status: "Statut",
    role: "Rôle", welcome_headline: "Découvrez l'Histoire\nChaque Jour", get_started: "Commencer",
    login: "Connexion", register: "S'inscrire", email: "E-mail", password: "Mot de passe",
    username: "Nom d'utilisateur", notif_title: "Ne manquez pas l'histoire",
    notif_desc: "Recevez une notification quotidienne sur ce qui s'est passé aujourd'hui.",
    allow_notif: "Autoriser les notifications", skip: "Plus tard",
    HISTORY: "Histoire", WAR: "Guerre", ART: "Art", SCIENCE: "Science",
    POLITICS: "Politique", EXPLORATION: "Exploration", CULTURE: "Culture",
    RELIGION: "Religion", ECONOMICS: "Économie", SPORTS: "Sport",
    TECHNOLOGY: "Technologie", NATURE: "Nature", war: "Guerre", art: "Art",
    science: "Science", politics: "Politique", exploration: "Exploration",
    culture: "Culture", religion: "Religion", economics: "Économie",
    sports: "Sport", technology: "Technologie", nature: "Nature",
    calendar_hint: "Choisissez une date pour explorer son histoire",
    // LEADERBOARD
    leaderboard: "Classement", your_rank: "VOTRE RANG",
    no_users_found: "Aucun utilisateur trouvé.", level: "Niveau"
  },

  de: {
    Daily: "Daily", History: "History", today: "Heute", tomorrow: "Morgen",
    history: "Geschichte", discover: "Entdecken", timeline: "Zeitleiste", map: "Karte",
    saved: "Gespeichert", retry: "Erneut versuchen", no_content: "Nichts hier",
    empty_today_desc: "Keine historischen Ereignisse für heute gefunden.",
    empty_day_desc: "Keine historischen Ereignisse für diesen Tag.",
    only_one_today: "Nur ein Ereignis heute", featured: "Empfohlen",
    more_today: "Mehr von heute", share_message: "Sieh dir diesen historischen Moment an: ",
    tap_for_story: "Tippen für Geschichte", impact: "Einfluss", significance: "Bedeutung",
    score: "Einfluss-Wert", close: "Schließen", read_story: "Geschichte lesen",
    profile_title: "Profil", your_stats: "Deine Statistiken", current_streak: "Serie",
    best_streak: "Rekord", stories_read: "Gelesen", achievements: "Auszeichnungen",
    streak_bonus: "Serienbonus", xp_today: "XP heute", appearance: "Aussehen",
    language: "Sprache", preferences: "Einstellungen", notifications: "Benachrichtigungen",
    on: "An", off: "Aus", account: "Konto", sign_in_method: "Anmeldemethode",
    sign_out: "Abmelden", contact_support: "Support Kontaktieren",
    contact_support_desc: "Fehlerberichte, Fragen, Vorschläge", rate_app: "Daily History bewerten",
    rate_app_desc: "Hilf uns mit einer Bewertung zu wachsen", share_app: "Mit Freunden teilen",
    share_app_desc: "Teile die Liebe zur Geschichte", active: "Aktiv", status: "Status",
    role: "Rolle", welcome_headline: "Entdecke die Geschichte\njeden Tag", get_started: "Jetzt starten",
    login: "Anmelden", register: "Registrieren", email: "E-Mail-Adresse", password: "Passwort",
    username: "Benutzername", notif_title: "Geschichte nicht verpassen",
    notif_desc: "Tägliche Benachrichtigung über Ereignisse in der Vergangenheit.",
    allow_notif: "Benachrichtigungen erlauben", skip: "Vielleicht später",
    HISTORY: "Geschichte", WAR: "Krieg", ART: "Kunst", SCIENCE: "Wissenschaft",
    POLITICS: "Politik", EXPLORATION: "Entdeckung", CULTURE: "Kultur",
    RELIGION: "Religion", ECONOMICS: "Wirtschaft", SPORTS: "Sport",
    TECHNOLOGY: "Technologie", NATURE: "Natur", war: "Krieg", art: "Kunst",
    science: "Wissenschaft", politics: "Politik", exploration: "Entdeckung",
    culture: "Kultur", religion: "Religion", economics: "Wirtschaft",
    sports: "Sport", technology: "Technologie", nature: "Natur",
    calendar_hint: "Wähle ein Datum, um seine Geschichte zu erkunden",
    // LEADERBOARD
    leaderboard: "Bestenliste", your_rank: "DEIN RANG",
    no_users_found: "Keine Benutzer gefunden.", level: "Level"
  },

  es: {
    Daily: "Daily", History: "History", today: "Hoy", tomorrow: "Mañana",
    history: "Historia", discover: "Descubrir", timeline: "Cronología", map: "Mapa",
    saved: "Guardados", retry: "Reintentar", no_content: "Nada aquí",
    empty_today_desc: "No se encontraron eventos históricos para hoy.",
    empty_day_desc: "No se encontraron eventos históricos para este día.",
    only_one_today: "Solo un evento hoy", featured: "Destacado",
    more_today: "Más de hoy", share_message: "Echa un vistazo a este momento histórico: ",
    tap_for_story: "Toca para la historia", impact: "Impacto", significance: "Significado",
    score: "Puntuación de impacto", close: "Cerrar", read_story: "Leer historia",
    profile_title: "Perfil", your_stats: "Tus Estadísticas", current_streak: "Racha",
    best_streak: "Récord", stories_read: "Leídas", achievements: "Premios",
    streak_bonus: "bonus de racha", xp_today: "XP hoy", appearance: "Apariencia",
    language: "Idioma", preferences: "Preferencias", notifications: "Notificaciones",
    on: "Activado", off: "Desactivado", account: "Cuenta", sign_in_method: "Método de inicio de sesión",
    sign_out: "Cerrar Sesión", contact_support: "Contactar Soporte",
    contact_support_desc: "Reportes de errores, preguntas, sugerencias", rate_app: "Evaluar Daily History",
    rate_app_desc: "Ayúdanos a crecer con una reseña", share_app: "Compartir con amigos",
    share_app_desc: "Difunde el amor por la historia", active: "Activo", status: "Estado",
    role: "Rol", welcome_headline: "Descubre la Historia\nCada Día", get_started: "Empezar",
    login: "Iniciar Sesión", register: "Registrarse", email: "Correo electrónico", password: "Contraseña",
    username: "Nombre de usuario", notif_title: "No te pierdas la historia",
    notif_desc: "Recibe una notificación diaria sobre lo que pasó hoy en el pasado.",
    allow_notif: "Permitir notificaciones", skip: "Más tarde",
    HISTORY: "Historia", WAR: "Guerra", ART: "Arte", SCIENCE: "Ciencia",
    POLITICS: "Política", EXPLORATION: "Exploración", CULTURE: "Cultura",
    RELIGION: "Religión", ECONOMICS: "Economía", SPORTS: "Deporte",
    TECHNOLOGY: "Tecnología", NATURE: "Naturaleza", war: "Guerra", art: "Arte",
    science: "Ciencia", politics: "Política", exploration: "Exploración",
    culture: "Cultura", religion: "Religión", economics: "Economía",
    sports: "Deporte", technology: "Tecnología", nature: "Naturaleza",
    calendar_hint: "Elige una fecha para explorar su historia",
    // LEADERBOARD
    leaderboard: "Clasificación", your_rank: "TU RANGO",
    no_users_found: "No se encontraron usuarios.", level: "Nivel"
  },
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    AsyncStorage.getItem("app_language")
      .then((stored) => {
        if (stored && ["en", "ro", "fr", "de", "es"].includes(stored)) {
          setLanguageState(stored as Language);
        }
      })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem("app_language", lang).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string): string => {
      const table = translations[language];
      return (
        table[key] ??
        table[key.toUpperCase()] ??
        table[key.toLowerCase()] ??
        key.replace(/_/g, ' ')
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