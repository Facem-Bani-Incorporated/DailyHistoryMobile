export type WW1Country = 'germany' | 'uk' | 'france' | 'usa' | 'russia' | 'ottoman' | 'austria' | 'other';
export type WarSide = 'central' | 'allied' | 'neutral';
export type WW1EventType = 'battle' | 'invasion' | 'bombing' | 'naval' | 'turning_point' | 'atrocity' | 'surrender' | 'treaty' | 'offensive';

export interface WW1Event {
  id: string;
  title: string;
  year: number;
  month: number; // 1–12
  latitude: number;
  longitude: number;
  countries: WW1Country[];
  side: WarSide; // central = red (Germany/Austria/Ottoman), allied = blue, neutral = grey
  type: WW1EventType;
  description: string; // 2-3 sentences
  casualties?: string;
  significance: 1 | 2 | 3;
  translations?: {
    ro?: { title: string; description: string };
    fr?: { title: string; description: string };
    de?: { title: string; description: string };
    es?: { title: string; description: string };
  };
}

export const WW1_YEAR_MIN = 1914;
export const WW1_YEAR_MAX = 1918;

export const WW1_EVENTS: WW1Event[] = [
  {
    id: 'franz-ferdinand-assassination',
    title: 'Assassination of Archduke Franz Ferdinand',
    year: 1914,
    month: 6,
    latitude: 43.8563,
    longitude: 18.4131,
    countries: ['austria'],
    side: 'central',
    type: 'turning_point',
    description: 'Austro-Hungarian Archduke Franz Ferdinand and his wife Sophie were shot dead by Bosnian-Serb nationalist Gavrilo Princip in Sarajevo on June 28, 1914. The assassination set off a chain of ultimatums and mobilizations that dragged the major European powers into war within six weeks.',
    significance: 3,
    translations: {
      ro: {
        title: 'Asasinarea Arhiducelui Franz Ferdinand',
        description: 'Arhiducele Franz Ferdinand al Austro-Ungariei și soția sa Sophie au fost împușcați de naționalistul bosniac-sârb Gavrilo Princip la Sarajevo, pe 28 iunie 1914. Asasinatul a declanșat un lanț de ultimatumuri și mobilizări care a atras marile puteri europene în război în mai puțin de șase săptămâni.',
      },
      fr: {
        title: "Assassinat de l'archiduc François-Ferdinand",
        description: "L'archiduc François-Ferdinand d'Autriche-Hongrie et son épouse Sophie furent abattus par le nationaliste bosnio-serbe Gavrilo Princip à Sarajevo le 28 juin 1914. L'assassinat déclencha une série d'ultimatums et de mobilisations qui entraîna les grandes puissances européennes dans la guerre en moins de six semaines.",
      },
      de: {
        title: 'Attentat auf Erzherzog Franz Ferdinand',
        description: 'Der österreichisch-ungarische Erzherzog Franz Ferdinand und seine Frau Sophie wurden am 28. Juni 1914 in Sarajevo vom bosnisch-serbischen Nationalisten Gavrilo Princip erschossen. Das Attentat löste eine Kette von Ultimaten und Mobilisierungen aus, die die europäischen Großmächte innerhalb von sechs Wochen in den Krieg zog.',
      },
      es: {
        title: 'Asesinato del Archiduque Francisco Fernando',
        description: 'El archiduque Francisco Fernando de Austria-Hungría y su esposa Sofía fueron asesinados a tiros por el nacionalista bosnio-serbio Gavrilo Princip en Sarajevo el 28 de junio de 1914. El asesinato desencadenó una cadena de ultimátums y movilizaciones que arrastró a las principales potencias europeas a la guerra en menos de seis semanas.',
      },
    },
  },
  {
    id: 'germany-invades-belgium',
    title: 'Germany Declares War and Invades Belgium',
    year: 1914,
    month: 8,
    latitude: 50.8503,
    longitude: 4.3517,
    countries: ['germany'],
    side: 'central',
    type: 'invasion',
    description: 'Executing the Schlieffen Plan, Germany declared war and swept through neutral Belgium in August 1914, triggering Britain\'s entry into the conflict. The violation of Belgian neutrality united much of world opinion against Germany and transformed the war into a global struggle.',
    significance: 3,
    translations: {
      ro: {
        title: 'Germania Declară Război și Invadează Belgia',
        description: 'Executând Planul Schlieffen, Germania a declarat război și a traversat Belgia neutră în august 1914, provocând intrarea Marii Britanii în conflict. Violarea neutralității belgiene a unit opinia mondială împotriva Germaniei și a transformat războiul într-un conflict global.',
      },
      fr: {
        title: "L'Allemagne déclare la guerre et envahit la Belgique",
        description: "En exécutant le Plan Schlieffen, l'Allemagne déclara la guerre et traversa la Belgique neutre en août 1914, provoquant l'entrée de la Grande-Bretagne dans le conflit. La violation de la neutralité belge unit l'opinion mondiale contre l'Allemagne et transforma la guerre en un conflit mondial.",
      },
      de: {
        title: 'Deutschland erklärt den Krieg und marschiert in Belgien ein',
        description: 'Im Rahmen des Schlieffen-Plans erklärte Deutschland den Krieg und marschierte im August 1914 durch das neutrale Belgien ein, was Großbritannien zum Kriegseintritt veranlasste. Die Verletzung der belgischen Neutralität vereinte einen Großteil der Weltmeinung gegen Deutschland und verwandelte den Krieg in einen globalen Konflikt.',
      },
      es: {
        title: 'Alemania declara la guerra e invade Bélgica',
        description: 'Ejecutando el Plan Schlieffen, Alemania declaró la guerra y atravesó la neutral Bélgica en agosto de 1914, provocando la entrada de Gran Bretaña en el conflicto. La violación de la neutralidad belga unió a gran parte de la opinión mundial contra Alemania y transformó la guerra en una lucha global.',
      },
    },
  },
  {
    id: 'first-battle-of-marne',
    title: 'First Battle of the Marne',
    year: 1914,
    month: 9,
    latitude: 49.0380,
    longitude: 3.4020,
    countries: ['france', 'uk', 'germany'],
    side: 'allied',
    type: 'battle',
    description: 'French and British forces halted the German advance along the Marne River in early September 1914, dashing Germany\'s hopes of a quick victory in the west. The German retreat to the Aisne River led directly to the "Race to the Sea" and the establishment of the static Western Front.',
    casualties: '~250,000 per side',
    significance: 3,
    translations: {
      ro: {
        title: 'Prima Bătălie de pe Marna',
        description: 'Forțele franceze și britanice au oprit avansul german de-a lungul râului Marna la începutul lui septembrie 1914, spulberând speranțele Germaniei la o victorie rapidă în vest. Retragerea germană spre râul Aisne a dus direct la „Cursa spre Mare" și la stabilirea Frontului de Vest static.',
      },
      fr: {
        title: 'Première bataille de la Marne',
        description: "Les forces françaises et britanniques stoppèrent l'avance allemande le long de la Marne début septembre 1914, anéantissant les espoirs d'une victoire rapide à l'ouest. La retraite allemande vers l'Aisne conduisit directement à la « Course à la mer » et à l'établissement du Front occidental statique.",
      },
      de: {
        title: 'Erste Marneschlacht',
        description: 'Französische und britische Truppen stoppten den deutschen Vormarsch entlang der Marne Anfang September 1914 und vernichteten Deutschlands Hoffnung auf einen schnellen Sieg im Westen. Der deutsche Rückzug zur Aisne führte direkt zum „Wettlauf zum Meer" und zur Entstehung der statischen Westfront.',
      },
      es: {
        title: 'Primera Batalla del Marne',
        description: 'Las fuerzas francesas y británicas detuvieron el avance alemán a lo largo del río Marne a principios de septiembre de 1914, frustrando las esperanzas de Alemania de una victoria rápida en el oeste. La retirada alemana hacia el río Aisne condujo directamente a la "Carrera hacia el Mar" y al establecimiento del estático Frente Occidental.',
      },
    },
  },
  {
    id: 'first-battle-of-ypres',
    title: 'First Battle of Ypres',
    year: 1914,
    month: 10,
    latitude: 50.8513,
    longitude: 2.8753,
    countries: ['germany', 'uk'],
    side: 'central',
    type: 'battle',
    description: 'German and British forces clashed around the Belgian town of Ypres in October–November 1914 as both sides attempted to outflank each other in the final stage of the Race to the Sea. The battle ended in stalemate but effectively destroyed the original British Expeditionary Force, with over 50,000 casualties.',
    casualties: '~130,000 total',
    significance: 2,
    translations: {
      ro: {
        title: 'Prima Bătălie de la Ypres',
        description: 'Forțele germane și britanice s-au ciocnit în jurul orașului belgian Ypres în octombrie–noiembrie 1914, pe măsură ce ambele tabere încercau să se depășească reciproc în etapa finală a Cursei spre Mare. Bătălia s-a încheiat cu un impas, dar a distrus efectiv Forța Expediționară Britanică originală, cu peste 50.000 de victime.',
      },
      fr: {
        title: 'Première bataille d\'Ypres',
        description: 'Les forces allemandes et britanniques s\'affrontèrent autour de la ville belge d\'Ypres en octobre–novembre 1914, les deux camps tentant de se déborder mutuellement lors de la phase finale de la Course à la mer. La bataille se termina dans une impasse mais détruisit effectivement le Corps expéditionnaire britannique d\'origine, avec plus de 50 000 pertes.',
      },
      de: {
        title: 'Erste Flandernschlacht',
        description: 'Deutsche und britische Truppen kämpften im Oktober–November 1914 um die belgische Stadt Ypern, als beide Seiten versuchten, sich gegenseitig zu umgehen in der letzten Phase des Wettlaufs zum Meer. Die Schlacht endete in einem Patt, zerstörte jedoch effektiv die ursprüngliche Britische Expeditionsarmee mit über 50.000 Verlusten.',
      },
      es: {
        title: 'Primera Batalla de Ypres',
        description: 'Las fuerzas alemanas y británicas chocaron alrededor de la ciudad belga de Ypres en octubre–noviembre de 1914, mientras ambos bandos intentaban flanquearse mutuamente en la etapa final de la Carrera hacia el Mar. La batalla terminó en un punto muerto, pero destruyó efectivamente la Fuerza Expedicionaria Británica original, con más de 50.000 bajas.',
      },
    },
  },
  {
    id: 'western-front-trenches',
    title: 'Western Front Trench Warfare Established',
    year: 1914,
    month: 12,
    latitude: 49.1584,
    longitude: 5.3870,
    countries: ['germany', 'france'],
    side: 'neutral',
    type: 'battle',
    description: 'By December 1914, both sides had dug a continuous line of trenches stretching from the English Channel to the Swiss border, roughly 700 kilometres in length. This trench system would define the Western Front for the next four years, turning the war into a brutal attritional conflict.',
    significance: 2,
    translations: {
      ro: {
        title: 'Stabilirea Războiului de Tranșee pe Frontul de Vest',
        description: 'Până în decembrie 1914, ambele tabere săpaseră o linie continuă de tranșee întinzându-se de la Canalul Mânecii până la granița elvețiană, de aproximativ 700 de kilometri lungime. Acest sistem de tranșee va defini Frontul de Vest timp de patru ani, transformând războiul într-un conflict de uzură brutal.',
      },
      fr: {
        title: 'Établissement de la guerre des tranchées sur le Front occidental',
        description: "En décembre 1914, les deux camps avaient creusé une ligne continue de tranchées s'étendant de la Manche à la frontière suisse, sur environ 700 kilomètres. Ce système de tranchées allait définir le Front occidental pendant quatre ans, transformant la guerre en un conflit d'attrition brutal.",
      },
      de: {
        title: 'Etablierung des Stellungskrieges an der Westfront',
        description: 'Bis Dezember 1914 hatten beide Seiten eine ununterbrochene Linie von Schützengräben gegraben, die sich vom Ärmelkanal bis zur Schweizer Grenze über etwa 700 Kilometer erstreckte. Dieses Grabensystem sollte die Westfront vier Jahre lang prägen und den Krieg in einen brutalen Abnutzungskonflikt verwandeln.',
      },
      es: {
        title: 'Establecimiento de la Guerra de Trincheras en el Frente Occidental',
        description: 'Para diciembre de 1914, ambos bandos habían cavado una línea continua de trincheras que se extendía desde el Canal de la Mancha hasta la frontera suiza, con una longitud de aproximadamente 700 kilómetros. Este sistema de trincheras definiría el Frente Occidental durante los siguientes cuatro años, convirtiendo la guerra en un brutal conflicto de desgaste.',
      },
    },
  },
  {
    id: 'gallipoli-campaign',
    title: 'Gallipoli Campaign Begins',
    year: 1915,
    month: 4,
    latitude: 40.3553,
    longitude: 26.6700,
    countries: ['uk', 'france', 'ottoman'],
    side: 'allied',
    type: 'battle',
    description: 'Allied forces landed on the Gallipoli Peninsula in April 1915 in an attempt to open a sea route to Russia through the Dardanelles and knock the Ottoman Empire out of the war. The campaign became a costly failure, with over 500,000 casualties on both sides before the Allies evacuated in January 1916.',
    casualties: '~500,000 total',
    significance: 3,
    translations: {
      ro: {
        title: 'Începe Campania de la Gallipoli',
        description: 'Forțele Aliate au debarcat pe Peninsula Gallipoli în aprilie 1915 în încercarea de a deschide o rută maritimă spre Rusia prin Dardanele și de a scoate Imperiul Otoman din război. Campania s-a dovedit un eșec costisitor, cu peste 500.000 de victime de ambele părți înainte ca Aliații să se evacueze în ianuarie 1916.',
      },
      fr: {
        title: 'Début de la campagne des Dardanelles',
        description: 'Les forces alliées débarquèrent sur la péninsule de Gallipoli en avril 1915 afin d\'ouvrir une route maritime vers la Russie à travers les Dardanelles et de mettre l\'Empire ottoman hors de combat. La campagne se révéla un échec coûteux, avec plus de 500 000 pertes des deux côtés avant l\'évacuation des Alliés en janvier 1916.',
      },
      de: {
        title: 'Beginn der Gallipoli-Kampagne',
        description: 'Alliierte Truppen landeten im April 1915 auf der Halbinsel Gallipoli, um eine Seeroute nach Russland durch die Dardanellen zu öffnen und das Osmanische Reich aus dem Krieg zu drängen. Die Kampagne wurde zu einem kostspieligen Misserfolg mit über 500.000 Verlusten auf beiden Seiten, bevor die Alliierten im Januar 1916 evakuierten.',
      },
      es: {
        title: 'Comienzo de la Campaña de Gallipoli',
        description: 'Las fuerzas Aliadas desembarcaron en la Península de Gallipoli en abril de 1915 en un intento de abrir una ruta marítima hacia Rusia a través de los Dardanelos y sacar al Imperio Otomano de la guerra. La campaña se convirtió en un costoso fracaso, con más de 500.000 bajas en ambos bandos antes de que los Aliados evacuaran en enero de 1916.',
      },
    },
  },
  {
    id: 'sinking-of-lusitania',
    title: 'Sinking of RMS Lusitania',
    year: 1915,
    month: 5,
    latitude: 50.1800,
    longitude: -8.5333,
    countries: ['germany'],
    side: 'central',
    type: 'naval',
    description: 'A German U-boat torpedoed the British ocean liner RMS Lusitania off the coast of Ireland on May 7, 1915, killing 1,198 passengers and crew including 128 Americans. The sinking inflamed opinion against Germany in neutral countries and was a factor in America\'s eventual decision to enter the war.',
    casualties: '1,198 killed',
    significance: 2,
    translations: {
      ro: {
        title: 'Scufundarea RMS Lusitania',
        description: 'Un submarin german a torpilat vasul britanic RMS Lusitania în largul coastei Irlandei pe 7 mai 1915, ucigând 1.198 de pasageri și membri ai echipajului, inclusiv 128 de americani. Scufundarea a inflamat opinia împotriva Germaniei în țările neutre și a constituit un factor în decizia ulterioară a Americii de a intra în război.',
      },
      fr: {
        title: 'Naufrage du RMS Lusitania',
        description: 'Un sous-marin allemand torpilla le paquebot britannique RMS Lusitania au large des côtes irlandaises le 7 mai 1915, tuant 1 198 passagers et membres d\'équipage dont 128 Américains. Le naufrage enflamma l\'opinion contre l\'Allemagne dans les pays neutres et fut un facteur dans la décision américaine d\'entrer en guerre.',
      },
      de: {
        title: 'Versenkung der RMS Lusitania',
        description: 'Ein deutsches U-Boot torpedierte den britischen Ozeandampfer RMS Lusitania am 7. Mai 1915 vor der irischen Küste und tötete 1.198 Passagiere und Besatzungsmitglieder, darunter 128 Amerikaner. Die Versenkung schürte die Stimmung gegen Deutschland in neutralen Ländern und war ein Faktor bei Amerikas endgültiger Entscheidung, in den Krieg einzutreten.',
      },
      es: {
        title: 'Hundimiento del RMS Lusitania',
        description: 'Un submarino alemán torpedeó el transatlántico británico RMS Lusitania frente a las costas de Irlanda el 7 de mayo de 1915, matando a 1.198 pasajeros y tripulantes, incluidos 128 estadounidenses. El hundimiento exacerbó la opinión contra Alemania en los países neutrales y fue un factor en la decisión eventual de Estados Unidos de entrar en la guerra.',
      },
    },
  },
  {
    id: 'italy-enters-war',
    title: 'Italy Enters War on Allied Side',
    year: 1915,
    month: 5,
    latitude: 41.9028,
    longitude: 12.4964,
    countries: ['other'],
    side: 'allied',
    type: 'treaty',
    description: 'Italy, despite being a member of the Triple Alliance with Germany and Austria-Hungary, declared war on Austria-Hungary in May 1915 after the secret Treaty of London promised territorial gains. Italy opened a new front along the Isonzo River, stretching Austro-Hungarian resources.',
    significance: 2,
    translations: {
      ro: {
        title: 'Italia Intră în Război de Partea Aliaților',
        description: 'Italia, în ciuda faptului că era membră a Triplei Alianțe cu Germania și Austro-Ungaria, a declarat război Austro-Ungariei în mai 1915, după ce Tratatul secret de la Londra a promis câștiguri teritoriale. Italia a deschis un nou front de-a lungul râului Isonzo, întinzând resursele Austro-Ungariei.',
      },
      fr: {
        title: "L'Italie entre en guerre du côté des Alliés",
        description: "L'Italie, bien que membre de la Triple Alliance avec l'Allemagne et l'Autriche-Hongrie, déclara la guerre à l'Autriche-Hongrie en mai 1915 après que le Traité secret de Londres lui eut promis des gains territoriaux. L'Italie ouvrit un nouveau front le long de la rivière Isonzo, mettant à rude épreuve les ressources austro-hongroises.",
      },
      de: {
        title: 'Italien tritt auf Seiten der Alliierten in den Krieg ein',
        description: 'Italien erklärte trotz seiner Mitgliedschaft im Dreibund mit Deutschland und Österreich-Ungarn im Mai 1915 Österreich-Ungarn den Krieg, nachdem der geheime Vertrag von London territoriale Gewinne versprochen hatte. Italien eröffnete eine neue Front entlang des Isonzo-Flusses und strapazierte damit die österreichisch-ungarischen Ressourcen.',
      },
      es: {
        title: 'Italia entra en la guerra del lado de los Aliados',
        description: 'Italia, a pesar de ser miembro de la Triple Alianza con Alemania y Austria-Hungría, declaró la guerra a Austria-Hungría en mayo de 1915 después de que el secreto Tratado de Londres prometiera ganancias territoriales. Italia abrió un nuevo frente a lo largo del río Isonzo, tensando los recursos austrohúngaros.',
      },
    },
  },
  {
    id: 'battle-of-verdun',
    title: 'Battle of Verdun',
    year: 1916,
    month: 2,
    latitude: 49.1584,
    longitude: 5.3870,
    countries: ['germany', 'france'],
    side: 'central',
    type: 'battle',
    description: 'Germany launched a massive offensive at Verdun in February 1916, intending to "bleed France white" in a battle of attrition around its most symbolic fortress city. The battle lasted ten months and became the longest of World War I, resulting in roughly 700,000 casualties without significant territorial change.',
    casualties: '~700,000 total',
    significance: 3,
    translations: {
      ro: {
        title: 'Bătălia de la Verdun',
        description: 'Germania a lansat o ofensivă masivă la Verdun în februarie 1916, cu intenția de a „sângera Franța albă" într-o bătălie de uzură în jurul orașului-fortăreață cel mai simbolic al acesteia. Bătălia a durat zece luni și a devenit cea mai lungă din Primul Război Mondial, rezultând în aproximativ 700.000 de victime fără schimbări teritoriale semnificative.',
      },
      fr: {
        title: 'Bataille de Verdun',
        description: 'L\'Allemagne lança une massive offensive à Verdun en février 1916 avec l\'intention de « saigner la France à blanc » dans une bataille d\'attrition autour de sa ville-forteresse la plus symbolique. La bataille dura dix mois et devint la plus longue de la Première Guerre mondiale, causant environ 700 000 pertes sans changement territorial significatif.',
      },
      de: {
        title: 'Schlacht von Verdun',
        description: 'Deutschland startete im Februar 1916 eine massive Offensive bei Verdun mit der Absicht, Frankreich in einer Abnutzungsschlacht um seine symbolträchtigste Festungsstadt „auszubluten". Die Schlacht dauerte zehn Monate und wurde zur längsten des Ersten Weltkriegs mit rund 700.000 Verlusten ohne wesentliche territoriale Veränderungen.',
      },
      es: {
        title: 'Batalla de Verdún',
        description: 'Alemania lanzó una ofensiva masiva en Verdún en febrero de 1916, con la intención de "desangrar a Francia" en una batalla de desgaste alrededor de su ciudad fortaleza más simbólica. La batalla duró diez meses y se convirtió en la más larga de la Primera Guerra Mundial, resultando en aproximadamente 700.000 bajas sin cambios territoriales significativos.',
      },
    },
  },
  {
    id: 'battle-of-jutland',
    title: 'Battle of Jutland',
    year: 1916,
    month: 5,
    latitude: 56.6000,
    longitude: 5.9000,
    countries: ['germany', 'uk'],
    side: 'central',
    type: 'naval',
    description: 'The largest naval battle of World War I brought the British Grand Fleet and German High Seas Fleet together in the North Sea on May 31–June 1, 1916. Although Germany inflicted greater losses, Britain retained control of the North Sea and Germany never again seriously challenged British naval supremacy.',
    casualties: '~9,800 British, ~3,000 German killed',
    significance: 3,
    translations: {
      ro: {
        title: 'Bătălia de la Iutlanda',
        description: 'Cea mai mare bătălie navală din Primul Război Mondial a adus Marea Flotă Britanică și Flota de Mare Largă Germană față în față în Marea Nordului pe 31 mai–1 iunie 1916. Deși Germania a provocat pierderi mai mari, Marea Britanie a păstrat controlul Mării Nordului, iar Germania nu a mai contestat serios supremația navală britanică.',
      },
      fr: {
        title: 'Bataille du Jutland',
        description: 'La plus grande bataille navale de la Première Guerre mondiale opposa la Grande Flotte britannique à la Flotte de haute mer allemande en mer du Nord les 31 mai et 1er juin 1916. Bien que l\'Allemagne ait infligé de plus grandes pertes, la Grande-Bretagne conserva le contrôle de la mer du Nord et l\'Allemagne ne contesta plus jamais sérieusement la suprématie navale britannique.',
      },
      de: {
        title: 'Skagerrakschlacht',
        description: 'Die größte Seeschlacht des Ersten Weltkriegs brachte die britische Grand Fleet und die deutsche Hochseeflotte am 31. Mai bis 1. Juni 1916 in der Nordsee zusammen. Obwohl Deutschland größere Verluste zufügte, behielt Großbritannien die Kontrolle über die Nordsee und Deutschland stellte nie wieder ernsthaft die britische Seeherrschaft in Frage.',
      },
      es: {
        title: 'Batalla de Jutlandia',
        description: 'La mayor batalla naval de la Primera Guerra Mundial enfrentó a la Gran Flota Británica y la Flota de Alta Mar Alemana en el Mar del Norte el 31 de mayo al 1 de junio de 1916. Aunque Alemania infligió mayores pérdidas, Gran Bretaña retuvo el control del Mar del Norte y Alemania nunca volvió a desafiar seriamente la supremacía naval británica.',
      },
    },
  },
  {
    id: 'battle-of-the-somme',
    title: 'Battle of the Somme',
    year: 1916,
    month: 7,
    latitude: 50.0000,
    longitude: 2.6667,
    countries: ['uk', 'france', 'germany'],
    side: 'allied',
    type: 'battle',
    description: 'The Somme offensive launched on July 1, 1916 became the bloodiest day in British military history, with nearly 57,000 casualties on the first day alone. Over five months of fighting the Allies advanced roughly eight miles at a cost of over one million total casualties.',
    casualties: '~1,000,000+ total',
    significance: 3,
    translations: {
      ro: {
        title: 'Bătălia de pe Somme',
        description: 'Ofensiva de pe Somme lansată pe 1 iulie 1916 a devenit cea mai sângeroasă zi din istoria militară britanică, cu aproape 57.000 de victime în prima zi. Pe parcursul a cinci luni de lupte, Aliații au avansat aproximativ 13 kilometri cu prețul a peste un milion de victime totale.',
      },
      fr: {
        title: 'Bataille de la Somme',
        description: "L'offensive de la Somme lancée le 1er juillet 1916 devint la journée la plus sanglante de l'histoire militaire britannique, avec près de 57 000 pertes dès le premier jour. Sur cinq mois de combats, les Alliés avancèrent d'environ 13 kilomètres au prix de plus d'un million de pertes totales.",
      },
      de: {
        title: 'Somme-Offensive',
        description: 'Die am 1. Juli 1916 gestartete Somme-Offensive wurde zum blutigsten Tag in der britischen Militärgeschichte mit fast 57.000 Verlusten am ersten Tag allein. In fünf Monaten Kämpfen rückten die Alliierten etwa 13 Kilometer vor und verloren dabei über eine Million Mann.',
      },
      es: {
        title: 'Batalla del Somme',
        description: 'La ofensiva del Somme lanzada el 1 de julio de 1916 se convirtió en el día más sangriento de la historia militar británica, con casi 57.000 bajas solo en el primer día. En cinco meses de combate los Aliados avanzaron aproximadamente 13 kilómetros a un costo de más de un millón de bajas totales.',
      },
    },
  },
  {
    id: 'brusilov-offensive',
    title: 'Brusilov Offensive',
    year: 1916,
    month: 6,
    latitude: 50.7472,
    longitude: 25.3254,
    countries: ['russia', 'austria'],
    side: 'allied',
    type: 'offensive',
    description: 'General Aleksei Brusilov launched a massive Russian offensive against Austro-Hungarian forces in June 1916, achieving one of the most successful Allied offensives of the entire war. The offensive inflicted over a million casualties on Austria-Hungary and shattered its fighting effectiveness, though Russia itself suffered heavily.',
    casualties: '~1,000,000 Austro-Hungarian, ~500,000 Russian',
    significance: 2,
    translations: {
      ro: {
        title: 'Ofensiva Brusilov',
        description: 'Generalul Aleksei Brusilov a lansat o ofensivă rusă masivă împotriva forțelor austro-ungare în iunie 1916, realizând una dintre cele mai reușite ofensive Aliate din întregul război. Ofensiva a provocat peste un milion de victime Austro-Ungariei și i-a zdrobit eficacitatea militară, deși Rusia însăși a suferit grav.',
      },
      fr: {
        title: 'Offensive Broussilov',
        description: 'Le général Alekseï Broussilov lança une massive offensive russe contre les forces austro-hongroises en juin 1916, réalisant l\'une des offensives alliées les plus réussies de toute la guerre. L\'offensive infligea plus d\'un million de pertes à l\'Autriche-Hongrie et brisa son efficacité combative, bien que la Russie elle-même ait lourdement souffert.',
      },
      de: {
        title: 'Brussilow-Offensive',
        description: 'General Aleksei Brussilow startete im Juni 1916 eine massive russische Offensive gegen die österreichisch-ungarischen Streitkräfte und erzielte einen der erfolgreichsten alliierten Vorstöße des gesamten Krieges. Die Offensive fügte Österreich-Ungarn über eine Million Verluste zu und zerstörte dessen Kampfeffektivität, obwohl Russland selbst schwer litt.',
      },
      es: {
        title: 'Ofensiva Brusilov',
        description: 'El general Aleksei Brusilov lanzó una masiva ofensiva rusa contra las fuerzas austrohúngaras en junio de 1916, logrando una de las ofensivas aliadas más exitosas de toda la guerra. La ofensiva infligió más de un millón de bajas a Austria-Hungría y destrozó su eficacia combativa, aunque la propia Rusia sufrió enormemente.',
      },
    },
  },
  {
    id: 'russian-revolution',
    title: 'Russian Revolution',
    year: 1917,
    month: 2,
    latitude: 59.9311,
    longitude: 30.3609,
    countries: ['russia'],
    side: 'allied',
    type: 'turning_point',
    description: 'The February Revolution overthrew Tsar Nicholas II in March 1917, replacing the autocracy with a Provisional Government that pledged to continue the war. The October Revolution that followed brought the Bolsheviks to power and set Russia on a course toward leaving the war entirely.',
    significance: 3,
    translations: {
      ro: {
        title: 'Revoluția Rusă',
        description: 'Revoluția din Februarie l-a răsturnat pe Țarul Nicolae al II-lea în martie 1917, înlocuind autocrația cu un Guvern Provizoriu care s-a angajat să continue războiul. Revoluția din Octombrie care a urmat a adus bolșevicii la putere și a pus Rusia pe calea ieșirii complete din război.',
      },
      fr: {
        title: 'Révolution russe',
        description: 'La Révolution de Février renversa le tsar Nicolas II en mars 1917, remplaçant l\'autocratie par un Gouvernement provisoire qui s\'engagea à poursuivre la guerre. La Révolution d\'Octobre qui suivit porta les bolchéviques au pouvoir et mit la Russie sur la voie d\'une sortie totale de la guerre.',
      },
      de: {
        title: 'Russische Revolution',
        description: 'Die Februarrevolution stürzte Zar Nikolaus II. im März 1917 und ersetzte die Autokratie durch eine Provisorische Regierung, die sich zur Fortsetzung des Krieges verpflichtete. Die darauffolgende Oktoberrevolution brachte die Bolschewiken an die Macht und setzte Russland auf einen Kurs, der zum vollständigen Kriegsaustritt führte.',
      },
      es: {
        title: 'Revolución Rusa',
        description: 'La Revolución de Febrero derrocó al Zar Nicolás II en marzo de 1917, reemplazando la autocracia con un Gobierno Provisional que se comprometió a continuar la guerra. La Revolución de Octubre que siguió llevó a los bolcheviques al poder y puso a Rusia en el camino hacia su salida total de la guerra.',
      },
    },
  },
  {
    id: 'usa-enters-war',
    title: 'United States Enters World War I',
    year: 1917,
    month: 4,
    latitude: 38.9072,
    longitude: -77.0369,
    countries: ['usa'],
    side: 'allied',
    type: 'treaty',
    description: 'President Woodrow Wilson asked Congress for a declaration of war against Germany on April 2, 1917, citing unrestricted submarine warfare and the Zimmermann Telegram as primary causes. American entry brought vast resources and fresh manpower to the Allies, ultimately tipping the balance against the exhausted Central Powers.',
    significance: 3,
    translations: {
      ro: {
        title: 'Statele Unite Intră în Primul Război Mondial',
        description: 'Președintele Woodrow Wilson a solicitat Congresului declararea războiului împotriva Germaniei pe 2 aprilie 1917, invocând războiul submarin nerestricționat și Telegrama Zimmermann ca cauze principale. Intrarea Americii a adus resurse vaste și forță de muncă proaspătă Aliaților, echilibrând în cele din urmă balanța împotriva Puterilor Centrale epuizate.',
      },
      fr: {
        title: 'Les États-Unis entrent dans la Première Guerre mondiale',
        description: 'Le président Woodrow Wilson demanda au Congrès une déclaration de guerre contre l\'Allemagne le 2 avril 1917, citant la guerre sous-marine à outrance et le Télégramme Zimmermann comme causes principales. L\'entrée américaine apporta de vastes ressources et de la main-d\'œuvre fraîche aux Alliés, faisant pencher la balance contre les Puissances centrales épuisées.',
      },
      de: {
        title: 'Die Vereinigten Staaten treten in den Ersten Weltkrieg ein',
        description: 'Präsident Woodrow Wilson bat den Kongress am 2. April 1917 um eine Kriegserklärung gegen Deutschland und nannte den uneingeschränkten U-Boot-Krieg und das Zimmermann-Telegramm als Hauptgründe. Der amerikanische Kriegseintritt brachte den Alliierten gewaltige Ressourcen und frische Truppenstärke und kippte letztlich die Waagschale gegen die erschöpften Mittelmächte.',
      },
      es: {
        title: 'Estados Unidos entra en la Primera Guerra Mundial',
        description: 'El presidente Woodrow Wilson solicitó al Congreso una declaración de guerra contra Alemania el 2 de abril de 1917, citando la guerra submarina sin restricciones y el Telegrama Zimmermann como causas principales. La entrada de Estados Unidos aportó vastos recursos y soldados frescos a los Aliados, inclinando finalmente la balanza contra las agotadas Potencias Centrales.',
      },
    },
  },
  {
    id: 'battle-of-passchendaele',
    title: 'Battle of Passchendaele (Third Ypres)',
    year: 1917,
    month: 7,
    latitude: 50.9003,
    longitude: 3.0167,
    countries: ['uk', 'germany'],
    side: 'allied',
    type: 'battle',
    description: 'The Third Battle of Ypres, fought from July to November 1917 in the waterlogged Flemish countryside, became synonymous with the senseless slaughter of World War I. British and Commonwealth forces advanced only five miles through waist-deep mud at a cost of roughly 310,000 casualties.',
    casualties: '~310,000 British, ~260,000 German',
    significance: 2,
    translations: {
      ro: {
        title: 'Bătălia de la Passchendaele (A Treia Bătălie de la Ypres)',
        description: 'A Treia Bătălie de la Ypres, purtată din iulie până în noiembrie 1917 în câmpia inundată a Flandrei, a devenit sinonimă cu masacrul fără sens din Primul Război Mondial. Forțele britanice și ale Commonwealth-ului au avansat doar opt kilometri prin noroi până la brâu cu prețul a aproximativ 310.000 de victime.',
      },
      fr: {
        title: 'Bataille de Passchendaele (Troisième bataille d\'Ypres)',
        description: 'La Troisième bataille d\'Ypres, livrée de juillet à novembre 1917 dans la campagne flamande inondée, est devenue synonyme du massacre insensé de la Première Guerre mondiale. Les forces britanniques et du Commonwealth n\'avancèrent que huit kilomètres à travers la boue jusqu\'à la taille au prix d\'environ 310 000 pertes.',
      },
      de: {
        title: 'Schlachtfeld Passchendaele (Dritte Flandernschlacht)',
        description: 'Die Dritte Flandernschlacht, von Juli bis November 1917 in der überschwemmten flämischen Landschaft gekämpft, wurde zum Synonym für das sinnlose Schlachten des Ersten Weltkriegs. Britische und Commonwealth-Truppen rückten nur acht Kilometer durch hüfttiefen Schlamm vor und verloren dabei rund 310.000 Mann.',
      },
      es: {
        title: 'Batalla de Passchendaele (Tercera Batalla de Ypres)',
        description: 'La Tercera Batalla de Ypres, librada de julio a noviembre de 1917 en el encharcado campo flamenco, se convirtió en sinónimo de la matanza sin sentido de la Primera Guerra Mundial. Las fuerzas británicas y de la Commonwealth avanzaron apenas ocho kilómetros a través del barro hasta la cintura a un costo de aproximadamente 310.000 bajas.',
      },
    },
  },
  {
    id: 'treaty-of-brest-litovsk',
    title: 'Treaty of Brest-Litovsk — Russia Exits the War',
    year: 1918,
    month: 3,
    latitude: 52.0976,
    longitude: 23.7341,
    countries: ['russia', 'germany'],
    side: 'allied',
    type: 'treaty',
    description: 'The Bolshevik government signed the Treaty of Brest-Litovsk with the Central Powers on March 3, 1918, ending Russian participation in the war at enormous territorial cost. The treaty freed around a million German troops for a last desperate offensive on the Western Front.',
    significance: 2,
    translations: {
      ro: {
        title: 'Tratatul de la Brest-Litovsk — Rusia Iese din Război',
        description: 'Guvernul bolșevic a semnat Tratatul de la Brest-Litovsk cu Puterile Centrale pe 3 martie 1918, punând capăt participării ruse la război cu un cost teritorial enorm. Tratatul a eliberat aproximativ un milion de soldați germani pentru o ultimă ofensivă disperată pe Frontul de Vest.',
      },
      fr: {
        title: 'Traité de Brest-Litovsk — La Russie sort de la guerre',
        description: 'Le gouvernement bolchevique signa le Traité de Brest-Litovsk avec les Puissances centrales le 3 mars 1918, mettant fin à la participation russe à la guerre à un coût territorial énorme. Le traité libéra environ un million de soldats allemands pour une dernière offensive désespérée sur le Front occidental.',
      },
      de: {
        title: 'Frieden von Brest-Litowsk — Russland scheidet aus dem Krieg aus',
        description: 'Die bolschewistische Regierung unterzeichnete am 3. März 1918 den Frieden von Brest-Litowsk mit den Mittelmächten und beendete damit Russlands Kriegsteilnahme zu enormen territorialen Kosten. Der Vertrag befreite rund eine Million deutsche Soldaten für eine letzte verzweifelte Offensive an der Westfront.',
      },
      es: {
        title: 'Tratado de Brest-Litovsk — Rusia sale de la guerra',
        description: 'El gobierno bolchevique firmó el Tratado de Brest-Litovsk con las Potencias Centrales el 3 de marzo de 1918, poniendo fin a la participación rusa en la guerra a un enorme costo territorial. El tratado liberó alrededor de un millón de soldados alemanes para una última ofensiva desesperada en el Frente Occidental.',
      },
    },
  },
  {
    id: 'operation-michael',
    title: 'German Spring Offensive (Operation Michael)',
    year: 1918,
    month: 3,
    latitude: 49.8941,
    longitude: 2.2958,
    countries: ['germany'],
    side: 'central',
    type: 'offensive',
    description: 'Germany launched Operation Michael on March 21, 1918, the first of the Ludendorff Offensives designed to win the war before American troops arrived in force. Using new stormtrooper infiltration tactics, German forces broke through Allied lines and advanced further in a single day than either side had in years, but ultimately outran their supply lines.',
    casualties: '~350,000 Allied, ~240,000 German',
    significance: 3,
    translations: {
      ro: {
        title: 'Ofensiva de Primăvară Germană (Operațiunea Michael)',
        description: 'Germania a lansat Operațiunea Michael pe 21 martie 1918, prima dintre Ofensivele Ludendorff concepute pentru a câștiga războiul înainte ca trupele americane să sosească în forță. Folosind noi tactici de infiltrare a trupelor de asalt, forțele germane au străpuns liniile Aliate și au avansat mai mult într-o singură zi decât oricare tabără în ani de zile, dar în cele din urmă și-au depășit liniile de aprovizionare.',
      },
      fr: {
        title: 'Offensive de printemps allemande (Opération Michael)',
        description: 'L\'Allemagne lança l\'Opération Michael le 21 mars 1918, la première des Offensives Ludendorff conçues pour gagner la guerre avant l\'arrivée en force des troupes américaines. Utilisant de nouvelles tactiques d\'infiltration de troupes d\'assaut, les forces allemandes percèrent les lignes alliées et avancèrent plus loin en une seule journée que l\'un ou l\'autre camp ne l\'avait fait depuis des années, mais dépassèrent finalement leurs lignes d\'approvisionnement.',
      },
      de: {
        title: 'Deutsche Frühjahrsoffensive (Unternehmen Michael)',
        description: 'Deutschland startete Unternehmen Michael am 21. März 1918, die erste der Ludendorff-Offensiven, die darauf ausgelegt waren, den Krieg zu gewinnen, bevor amerikanische Truppen in Kraft eintrafen. Mit neuen Sturm truppen-Infiltrationstaktiken durchbrachen deutsche Kräfte die alliierten Linien und rückten an einem einzigen Tag weiter vor als eine der beiden Seiten seit Jahren, überschritten dabei jedoch letztlich ihre Versorgungslinien.',
      },
      es: {
        title: 'Ofensiva de Primavera Alemana (Operación Michael)',
        description: 'Alemania lanzó la Operación Michael el 21 de marzo de 1918, la primera de las Ofensivas Ludendorff diseñadas para ganar la guerra antes de que las tropas estadounidenses llegaran en fuerza. Usando nuevas tácticas de infiltración de tropas de asalto, las fuerzas alemanas atravesaron las líneas Aliadas y avanzaron más en un solo día de lo que cualquier bando había logrado en años, pero finalmente superaron sus líneas de suministro.',
      },
    },
  },
  {
    id: 'second-battle-of-marne',
    title: 'Second Battle of the Marne — Allied Counterattack',
    year: 1918,
    month: 7,
    latitude: 49.0380,
    longitude: 3.4020,
    countries: ['france', 'usa'],
    side: 'allied',
    type: 'turning_point',
    description: 'Allied forces under Foch launched a surprise counterattack at the Marne in July 1918, halting the last German offensive and beginning the strategic initiative that would win the war. French and American troops pushed the Germans back across the Marne, marking the definitive turning point on the Western Front.',
    casualties: '~170,000 Allied, ~170,000 German',
    significance: 3,
    translations: {
      ro: {
        title: 'A Doua Bătălie de pe Marna — Contraofensiva Aliată',
        description: 'Forțele Aliate sub comanda lui Foch au lansat o contraofensivă surpriză la Marna în iulie 1918, oprind ultima ofensivă germană și inițiind inițiativa strategică care va câștiga războiul. Trupele franceze și americane i-au împins pe germani înapoi peste Marna, marcând punctul de cotitură definitiv pe Frontul de Vest.',
      },
      fr: {
        title: 'Deuxième bataille de la Marne — Contre-attaque alliée',
        description: 'Les forces alliées sous Foch lancèrent une contre-attaque surprise sur la Marne en juillet 1918, arrêtant la dernière offensive allemande et amorçant l\'initiative stratégique qui allait gagner la guerre. Les troupes françaises et américaines repoussèrent les Allemands au-delà de la Marne, marquant le point de retournement décisif sur le Front occidental.',
      },
      de: {
        title: 'Zweite Marneschlacht — Alliierter Gegenangriff',
        description: 'Alliierte Truppen unter Foch starteten im Juli 1918 einen Überraschungsgegenangriff an der Marne, stoppten die letzte deutsche Offensive und leiteten die strategische Initiative ein, die den Krieg gewinnen sollte. Französische und amerikanische Truppen drängten die Deutschen hinter die Marne zurück und markierten damit den entscheidenden Wendepunkt an der Westfront.',
      },
      es: {
        title: 'Segunda Batalla del Marne — Contraataque Aliado',
        description: 'Las fuerzas Aliadas bajo Foch lanzaron un contraataque sorpresa en el Marne en julio de 1918, deteniendo la última ofensiva alemana e iniciando la iniciativa estratégica que ganaría la guerra. Las tropas francesas y estadounidenses empujaron a los alemanes de vuelta al otro lado del Marne, marcando el definitivo punto de inflexión en el Frente Occidental.',
      },
    },
  },
  {
    id: 'hundred-days-offensive',
    title: 'Hundred Days Offensive Begins',
    year: 1918,
    month: 8,
    latitude: 49.8941,
    longitude: 2.2958,
    countries: ['uk', 'france', 'usa', 'other'],
    side: 'allied',
    type: 'offensive',
    description: 'The Hundred Days Offensive began with the Battle of Amiens on August 8, 1918, described by Ludendorff as the "black day of the German Army." British, French, Australian, Canadian, and American forces advanced relentlessly, liberating vast swaths of France and Belgium and forcing Germany to seek an armistice.',
    casualties: '~700,000 Allied, ~785,000 German',
    significance: 3,
    translations: {
      ro: {
        title: 'Ofensiva celor O Sută de Zile Începe',
        description: 'Ofensiva celor O Sută de Zile a început cu Bătălia de la Amiens pe 8 august 1918, descrisă de Ludendorff drept „ziua neagră a Armatei Germane". Forțele britanice, franceze, australiene, canadiene și americane au avansat neîncetat, eliberând vaste zone din Franța și Belgia și forțând Germania să caute un armistițiu.',
      },
      fr: {
        title: 'Début de l\'Offensive des Cent Jours',
        description: 'L\'Offensive des Cent Jours commença par la bataille d\'Amiens le 8 août 1918, décrite par Ludendorff comme le « jour noir de l\'armée allemande ». Les forces britanniques, françaises, australiennes, canadiennes et américaines avancèrent sans relâche, libérant de vastes étendues de France et de Belgique et forçant l\'Allemagne à chercher un armistice.',
      },
      de: {
        title: 'Beginn der Hunderttageoffensive',
        description: 'Die Hunderttageoffensive begann mit der Amiens-Offensive am 8. August 1918, von Ludendorff als „schwarzer Tag des deutschen Heeres" bezeichnet. Britische, französische, australische, kanadische und amerikanische Kräfte rückten unaufhaltsam vor, befreiten weite Teile Frankreichs und Belgiens und zwangen Deutschland, einen Waffenstillstand zu suchen.',
      },
      es: {
        title: 'Comienza la Ofensiva de los Cien Días',
        description: 'La Ofensiva de los Cien Días comenzó con la Batalla de Amiens el 8 de agosto de 1918, descrita por Ludendorff como el "día negro del Ejército Alemán". Las fuerzas británicas, francesas, australianas, canadienses y estadounidenses avanzaron sin descanso, liberando vastas extensiones de Francia y Bélgica y obligando a Alemania a buscar un armisticio.',
      },
    },
  },
  {
    id: 'ottoman-armistice',
    title: 'Ottoman Empire Armistice',
    year: 1918,
    month: 10,
    latitude: 41.0082,
    longitude: 28.9784,
    countries: ['ottoman'],
    side: 'central',
    type: 'surrender',
    description: 'The Ottoman Empire signed the Armistice of Mudros on October 30, 1918, ending its participation in World War I after defeats in Palestine and Mesopotamia. The armistice opened the straits to Allied warships and marked the beginning of the partition of the Ottoman Empire.',
    significance: 2,
    translations: {
      ro: {
        title: 'Armistițiul Imperiului Otoman',
        description: 'Imperiul Otoman a semnat Armistițiul de la Mudros pe 30 octombrie 1918, punând capăt participării sale la Primul Război Mondial după înfrângerile din Palestina și Mesopotamia. Armistițiul a deschis strâmtorile navelor de război Aliate și a marcat începutul partajării Imperiului Otoman.',
      },
      fr: {
        title: "Armistice de l'Empire ottoman",
        description: "L'Empire ottoman signa l'Armistice de Moudros le 30 octobre 1918, mettant fin à sa participation à la Première Guerre mondiale après ses défaites en Palestine et en Mésopotamie. L'armistice ouvrit les détroits aux navires de guerre alliés et marqua le début du partage de l'Empire ottoman.",
      },
      de: {
        title: 'Waffenstillstand des Osmanischen Reiches',
        description: 'Das Osmanische Reich unterzeichnete am 30. Oktober 1918 den Waffenstillstand von Mudros und beendete damit seine Teilnahme am Ersten Weltkrieg nach Niederlagen in Palästina und Mesopotamien. Der Waffenstillstand öffnete die Meerengen für alliierte Kriegsschiffe und markierte den Beginn der Aufteilung des Osmanischen Reiches.',
      },
      es: {
        title: 'Armisticio del Imperio Otomano',
        description: 'El Imperio Otomano firmó el Armisticio de Mudros el 30 de octubre de 1918, poniendo fin a su participación en la Primera Guerra Mundial tras las derrotas en Palestina y Mesopotamia. El armisticio abrió los estrechos a los buques de guerra Aliados y marcó el comienzo de la partición del Imperio Otomano.',
      },
    },
  },
  {
    id: 'armistice-november-1918',
    title: 'Armistice — The War Ends',
    year: 1918,
    month: 11,
    latitude: 49.4181,
    longitude: 2.8268,
    countries: ['germany', 'france', 'uk', 'usa'],
    side: 'central',
    type: 'surrender',
    description: 'Germany signed the Armistice in a railway carriage in the Forest of Compiègne at 5:00 AM on November 11, 1918, with fighting ceasing at the eleventh hour of the eleventh day of the eleventh month. World War I was over, having killed approximately 20 million people and wounded 21 million more.',
    casualties: '~20,000,000 dead total',
    significance: 3,
    translations: {
      ro: {
        title: 'Armistițiul — Războiul se Termină',
        description: 'Germania a semnat Armistițiul într-un vagon de tren în Pădurea Compiègne la ora 5:00 dimineața pe 11 noiembrie 1918, luptele încetând la a unsprezecea oră din a unsprezecea zi a celei de-a unsprezecea luni. Primul Război Mondial se încheiase, ucigând aproximativ 20 de milioane de oameni și rănind încă 21 de milioane.',
      },
      fr: {
        title: "Armistice — La guerre se termine",
        description: "L'Allemagne signa l'Armistice dans un wagon de chemin de fer dans la forêt de Compiègne à 5h00 du matin le 11 novembre 1918, les combats cessant à la onzième heure du onzième jour du onzième mois. La Première Guerre mondiale était terminée, ayant tué environ 20 millions de personnes et blessé 21 millions de plus.",
      },
      de: {
        title: 'Waffenstillstand — Der Krieg endet',
        description: 'Deutschland unterzeichnete den Waffenstillstand in einem Eisenbahnwaggon im Wald von Compiègne um 5:00 Uhr morgens am 11. November 1918, wobei die Kämpfe in der elften Stunde des elften Tages des elften Monats eingestellt wurden. Der Erste Weltkrieg war vorüber und hatte etwa 20 Millionen Menschen getötet und weitere 21 Millionen verwundet.',
      },
      es: {
        title: 'Armisticio — La guerra termina',
        description: 'Alemania firmó el Armisticio en un vagón de ferrocarril en el Bosque de Compiègne a las 5:00 de la mañana del 11 de noviembre de 1918, cesando los combates a la undécima hora del undécimo día del undécimo mes. La Primera Guerra Mundial había terminado, habiendo matado a aproximadamente 20 millones de personas y herido a otros 21 millones.',
      },
    },
  },
  {
    id: 'treaty-of-versailles',
    title: 'Treaty of Versailles',
    year: 1919,
    month: 6,
    latitude: 48.8014,
    longitude: 2.1301,
    countries: ['germany', 'france', 'uk', 'usa'],
    side: 'central',
    type: 'treaty',
    description: 'The Treaty of Versailles, signed on June 28, 1919, officially ended the state of war between Germany and the Allied Powers, imposing harsh reparations, territorial losses, and the "war guilt" clause on Germany. The punitive terms generated lasting resentment in Germany and created the conditions that would contribute to the rise of Adolf Hitler and the outbreak of World War II.',
    significance: 3,
    translations: {
      ro: {
        title: 'Tratatul de la Versailles',
        description: 'Tratatul de la Versailles, semnat pe 28 iunie 1919, a încheiat oficial starea de război dintre Germania și Puterile Aliate, impunând Germaniei reparații dure, pierderi teritoriale și clauza „vinovăției de război". Termenii punitivi au generat resentimente de durată în Germania și au creat condițiile care au contribuit la ascensiunea lui Adolf Hitler și la izbucnirea celui de-al Doilea Război Mondial.',
      },
      fr: {
        title: 'Traité de Versailles',
        description: 'Le Traité de Versailles, signé le 28 juin 1919, mit officiellement fin à l\'état de guerre entre l\'Allemagne et les Puissances alliées, imposant à l\'Allemagne de lourdes réparations, des pertes territoriales et la clause de « culpabilité de guerre ». Les termes punitifs engendrèrent un ressentiment durable en Allemagne et créèrent les conditions qui allaient contribuer à l\'ascension d\'Adolf Hitler et au déclenchement de la Seconde Guerre mondiale.',
      },
      de: {
        title: 'Vertrag von Versailles',
        description: 'Der Vertrag von Versailles, unterzeichnet am 28. Juni 1919, beendete offiziell den Kriegszustand zwischen Deutschland und den Alliierten Mächten und erlegte Deutschland schwere Reparationen, Gebietsverluste und die „Kriegsschuldklausel" auf. Die strafenden Bedingungen erzeugten dauerhaftes Ressentiment in Deutschland und schufen die Voraussetzungen, die zum Aufstieg Adolf Hitlers und zum Ausbruch des Zweiten Weltkriegs beitragen sollten.',
      },
      es: {
        title: 'Tratado de Versalles',
        description: 'El Tratado de Versalles, firmado el 28 de junio de 1919, puso fin oficialmente al estado de guerra entre Alemania y las Potencias Aliadas, imponiendo a Alemania duras reparaciones, pérdidas territoriales y la cláusula de "culpa de guerra". Los términos punitivos generaron un resentimiento duradero en Alemania y crearon las condiciones que contribuirían al ascenso de Adolf Hitler y al estallido de la Segunda Guerra Mundial.',
      },
    },
  },
];
