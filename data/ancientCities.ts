// data/ancientCities.ts
// Famous ancient cities overlay for the map

export interface AncientCity {
  id: string;
  name: string;
  civilization: string;
  period: string; // e.g. "3100–30 BC"
  peakPopulation: string;
  latitude: number;
  longitude: number;
  emoji: string;
  color: string;
  description: string;
  funFact: string;
  status: 'ruins' | 'modern_city' | 'lost' | 'submerged';
  translations?: {
    ro?: { description: string; funFact: string };
    fr?: { description: string; funFact: string };
    de?: { description: string; funFact: string };
    es?: { description: string; funFact: string };
  };
}

export const ANCIENT_CITIES: AncientCity[] = [
  {
    id: 'rome',
    name: 'Rome',
    civilization: 'Roman Empire',
    period: '753 BC – present',
    peakPopulation: '1,000,000 (100 AD)',
    latitude: 41.9028,
    longitude: 12.4964,
    emoji: '🏛️',
    color: '#DC2626',
    description: 'The Eternal City ruled an empire stretching from Britain to Mesopotamia. At its peak under Emperor Trajan, Rome was the largest city in the Western world, with running water, sewers, paved roads, and the Colosseum hosting 80,000 spectators.',
    funFact: 'Rome had the first recorded apartment buildings (insulae) reaching 6-7 stories high — they often collapsed or burned down.',
    status: 'modern_city',
    translations: {
      ro: {
        description: 'Orașul Etern a condus un imperiu care se întindea de la Britania până în Mesopotamia. La apogeul său, sub împăratul Traian, Roma era cel mai mare oraș din lumea occidentală, cu apă curentă, canalizare, drumuri pavate și Colosseumul care găzduia 80.000 de spectatori.',
        funFact: 'Roma a avut primele blocuri de apartamente înregistrate (insulae) care atingeau 6-7 etaje — acestea se prăbușeau sau ardeau frecvent.',
      },
      fr: {
        description: 'La Ville Éternelle gouvernait un empire s\'étendant de la Bretagne à la Mésopotamie. À son apogée sous l\'empereur Trajan, Rome était la plus grande ville du monde occidental, dotée d\'eau courante, d\'égouts, de routes pavées et du Colisée accueillant 80 000 spectateurs.',
        funFact: 'Rome possédait les premiers immeubles d\'appartements connus (insulae) atteignant 6 à 7 étages — ils s\'effondraient ou brûlaient fréquemment.',
      },
      de: {
        description: 'Die Ewige Stadt herrschte über ein Reich, das sich von Britannien bis Mesopotamien erstreckte. Auf ihrem Höhepunkt unter Kaiser Trajan war Rom die größte Stadt der westlichen Welt, mit fließendem Wasser, Kanalisation, gepflasterten Straßen und dem Kolosseum, das 80.000 Zuschauer fasste.',
        funFact: 'Rom hatte die ersten bekannten Mietshäuser (Insulae) mit 6–7 Stockwerken — sie stürzten häufig ein oder brannten nieder.',
      },
      es: {
        description: 'La Ciudad Eterna gobernó un imperio que se extendía desde Britania hasta Mesopotamia. En su apogeo bajo el emperador Trajano, Roma era la ciudad más grande del mundo occidental, con agua corriente, alcantarillado, calzadas empedradas y el Coliseo con capacidad para 80.000 espectadores.',
        funFact: 'Roma tuvo los primeros edificios de apartamentos registrados (insulae) que alcanzaban 6-7 pisos — con frecuencia se derrumbaban o se incendiaban.',
      },
    },
  },
  {
    id: 'carthage',
    name: 'Carthage',
    civilization: 'Phoenician / Carthaginian',
    period: '814–146 BC',
    peakPopulation: '500,000 (200 BC)',
    latitude: 36.8528,
    longitude: 10.3233,
    emoji: '⚓',
    color: '#7C3AED',
    description: 'Rome\'s greatest rival commanded the western Mediterranean from its powerful harbor in modern Tunisia. Carthage fielded the mighty Hannibal, who crossed the Alps with war elephants to nearly destroy Rome. Razed utterly by Rome in 146 BC — "Carthago delenda est."',
    funFact: 'After destroying Carthage, Roman soldiers supposedly salted the earth so nothing would grow there — though modern historians debate if this actually happened.',
    status: 'ruins',
    translations: {
      ro: {
        description: 'Cel mai mare rival al Romei domina Mediterana de vest din portul său puternic din Tunisia modernă. Cartagina l-a dat pe puternicul Hannibal, care a traversat Alpii cu elefanți de război aproape distrugând Roma. Rasă de pe fața pământului de Roma în 146 î.Hr. — „Carthago delenda est."',
        funFact: 'După distrugerea Cartaginei, soldații romani ar fi presărat sare pe pământ pentru ca nimic să nu mai crească acolo — deși istoricii moderni dezbat dacă acest lucru s-a întâmplat cu adevărat.',
      },
      fr: {
        description: 'La plus grande rivale de Rome dominait la Méditerranée occidentale depuis son puissant port en Tunisie actuelle. Carthage a produit le redoutable Hannibal, qui franchit les Alpes avec des éléphants de guerre pour presque détruire Rome. Rasée de fond en comble par Rome en 146 av. J.-C. — « Carthago delenda est. »',
        funFact: 'Après avoir détruit Carthage, les soldats romains auraient salé les terres pour qu\'aucune culture ne pousse — bien que les historiens modernes débattent de l\'authenticité de cet événement.',
      },
      de: {
        description: 'Roms größter Rivale beherrschte das westliche Mittelmeer von seinem mächtigen Hafen im heutigen Tunesien aus. Karthago stellte den gewaltigen Hannibal auf, der mit Kriegselefanten die Alpen überquerte und Rom fast vernichtete. Von Rom 146 v. Chr. vollständig dem Erdboden gleichgemacht — „Carthago delenda est."',
        funFact: 'Nach der Zerstörung Karthagos sollen römische Soldaten die Erde gesalzen haben, damit nichts mehr wächst — obwohl moderne Historiker bezweifeln, ob dies wirklich geschah.',
      },
      es: {
        description: 'El mayor rival de Roma dominaba el Mediterráneo occidental desde su poderoso puerto en la actual Túnez. Cartago produjo al temible Aníbal, que cruzó los Alpes con elefantes de guerra casi destruyendo Roma. Arrasada por completo por Roma en 146 a.C. — «Carthago delenda est».',
        funFact: 'Tras destruir Cartago, los soldados romanos supuestamente salaron la tierra para que nada volviera a crecer allí, aunque los historiadores modernos debaten si esto ocurrió realmente.',
      },
    },
  },
  {
    id: 'babylon',
    name: 'Babylon',
    civilization: 'Babylonian Empire',
    period: '2300–539 BC',
    peakPopulation: '200,000 (600 BC)',
    latitude: 32.5427,
    longitude: 44.4219,
    emoji: '🏗️',
    color: '#B45309',
    description: 'The greatest city of the ancient Near East, Babylon under Nebuchadnezzar II had the legendary Hanging Gardens (one of the Seven Wonders), the Ishtar Gate with its brilliant blue tiles, and the Etemenanki ziggurat — the likely inspiration for the Tower of Babel.',
    funFact: 'Babylon\'s walls were so thick that a four-horse chariot could turn around on top of them. Herodotus described the city as 14 miles on each side.',
    status: 'ruins',
    translations: {
      ro: {
        description: 'Cel mai mare oraș din Orientul Apropiat antic, Babilonul lui Nebucadnețar al II-lea adăpostea legendarii Grădini Suspendate (una dintre cele Șapte Minuni), Poarta Ištar cu faianțele sale albastre strălucitoare și zigguratul Etemenanki — probabil inspirația pentru Turnul Babel.',
        funFact: 'Zidurile Babilonului erau atât de groase încât un car cu patru cai putea face întoarcere pe ele. Herodot descria orașul ca având 14 mile pe fiecare latură.',
      },
      fr: {
        description: 'La plus grande ville du Proche-Orient antique, Babylone sous Nabuchodonosor II abritait les légendaires Jardins suspendus (l\'une des Sept Merveilles), la Porte d\'Ishtar avec ses brillantes faïences bleues, et la ziggurat Etemenanki — l\'inspiration probable de la Tour de Babel.',
        funFact: 'Les remparts de Babylone étaient si épais qu\'un char à quatre chevaux pouvait y faire demi-tour. Hérodote décrivait la ville comme mesurant 14 miles de chaque côté.',
      },
      de: {
        description: 'Die größte Stadt des alten Nahen Ostens, Babylon unter Nebukadnezar II., beherbergte die sagenhaften Hängenden Gärten (eines der Sieben Weltwunder), das Ischtar-Tor mit seinen leuchtend blauen Kacheln und die Etemenanki-Zikkurat — wahrscheinlich die Inspiration für den Turm zu Babel.',
        funFact: 'Die Mauern Babylons waren so dick, dass ein vierrädriger Streitwagen auf ihnen wenden konnte. Herodot beschrieb die Stadt als 14 Meilen auf jeder Seite.',
      },
      es: {
        description: 'La ciudad más grande del antiguo Oriente Próximo, Babilonia bajo Nabucodonosor II albergaba los legendarios Jardines Colgantes (una de las Siete Maravillas), la Puerta de Ishtar con sus brillantes azulejos azules y el zigurat Etemenanki, probable inspiración de la Torre de Babel.',
        funFact: 'Las murallas de Babilonia eran tan gruesas que un carro de cuatro caballos podía girar sobre ellas. Heródoto describía la ciudad como de 14 millas por lado.',
      },
    },
  },
  {
    id: 'athens',
    name: 'Athens',
    civilization: 'Ancient Greece',
    period: '3000 BC – present',
    peakPopulation: '300,000 (430 BC)',
    latitude: 37.9838,
    longitude: 23.7275,
    emoji: '🏺',
    color: '#1D4ED8',
    description: 'Birthplace of democracy, philosophy, theater, and much of Western civilization. The Parthenon, dedicated to Athena, still crowns the Acropolis. Athens produced Socrates, Plato, Aristotle, Sophocles, and Pericles — arguably the most influential city in human intellectual history.',
    funFact: 'Ancient Athens had a practice called "ostracism" — citizens could vote to exile any person they found too powerful by writing his name on a pottery shard (ostrakon).',
    status: 'modern_city',
    translations: {
      ro: {
        description: 'Leagănul democrației, filozofiei, teatrului și al marii parte a civilizației occidentale. Partenonul, dedicat Atenei, încoronează și astăzi Acropola. Atena a dat naștere lui Socrate, Platon, Aristotel, Sofocle și Pericle — probabil cel mai influent oraș din istoria intelectuală a omenirii.',
        funFact: 'Atena antică practica „ostracismul" — cetățenii puteau vota exilarea oricărei persoane considerate prea puternice scriindu-i numele pe un ciob de ceramică (ostrakon).',
      },
      fr: {
        description: 'Berceau de la démocratie, de la philosophie, du théâtre et d\'une grande part de la civilisation occidentale. Le Parthénon, dédié à Athéna, couronne encore l\'Acropole. Athènes a produit Socrate, Platon, Aristote, Sophocle et Périclès — sans doute la ville la plus influente de l\'histoire intellectuelle humaine.',
        funFact: 'L\'Athènes antique pratiquait l\'« ostracisme » — les citoyens pouvaient voter l\'exil de toute personne jugée trop puissante en gravant son nom sur un tesson de poterie (ostrakon).',
      },
      de: {
        description: 'Geburtsort der Demokratie, Philosophie, des Theaters und eines Großteils der westlichen Zivilisation. Das Parthenon, der Athena geweiht, krönt noch heute die Akropolis. Athen brachte Sokrates, Platon, Aristoteles, Sophokles und Perikles hervor — wohl die einflussreichste Stadt in der intellektuellen Geschichte der Menschheit.',
        funFact: 'Das antike Athen kannte die Praxis des „Ostrakismus" — Bürger konnten abstimmen, jede als zu mächtig empfundene Person zu verbannen, indem sie deren Namen auf einen Tonscherben (Ostrakon) ritzten.',
      },
      es: {
        description: 'Cuna de la democracia, la filosofía, el teatro y gran parte de la civilización occidental. El Partenón, dedicado a Atenea, aún corona la Acrópolis. Atenas produjo a Sócrates, Platón, Aristóteles, Sófocles y Pericles, siendo posiblemente la ciudad más influyente de la historia intelectual humana.',
        funFact: 'La Atenas antigua practicaba el «ostracismo»: los ciudadanos podían votar el exilio de cualquier persona considerada demasiado poderosa escribiendo su nombre en un fragmento de cerámica (ostrakon).',
      },
    },
  },
  {
    id: 'alexandria',
    name: 'Alexandria',
    civilization: 'Ptolemaic Egypt / Roman',
    period: '331 BC – present',
    peakPopulation: '750,000 (100 AD)',
    latitude: 31.2001,
    longitude: 29.9187,
    emoji: '📚',
    color: '#0891B2',
    description: 'Founded by Alexander the Great in 331 BC, Alexandria became the intellectual capital of the ancient world. Its Library held up to 700,000 scrolls. The Lighthouse of Alexandria was one of the Seven Wonders. Cleopatra VII ruled here, the last pharaoh of Egypt.',
    funFact: 'The Library of Alexandria had a law requiring all ships docking in harbor to surrender any scrolls they carried, which were copied and the copies returned to the ships while Alexandria kept the originals.',
    status: 'modern_city',
    translations: {
      ro: {
        description: 'Fondată de Alexandru cel Mare în 331 î.Hr., Alexandria a devenit capitala intelectuală a lumii antice. Biblioteca sa adăpostea până la 700.000 de suluri. Farul din Alexandria era una dintre cele Șapte Minuni. Cleopatra a VII-a a condus de aici, ultimul faraon al Egiptului.',
        funFact: 'Biblioteca din Alexandria impunea tuturor navelor care ancorau în port să predea orice sul pe care îl aveau la bord; sulurile erau copiate, copiile returnate navelor, iar Alexandria păstra originalele.',
      },
      fr: {
        description: 'Fondée par Alexandre le Grand en 331 av. J.-C., Alexandrie devint la capitale intellectuelle du monde antique. Sa Bibliothèque contenait jusqu\'à 700 000 rouleaux. Le Phare d\'Alexandrie était l\'une des Sept Merveilles. Cléopâtre VII y régna, dernière pharaonne d\'Égypte.',
        funFact: 'La Bibliothèque d\'Alexandrie imposait à tous les navires arrivant au port de remettre leurs rouleaux ; ceux-ci étaient copiés, les copies rendues aux navires, tandis qu\'Alexandrie conservait les originaux.',
      },
      de: {
        description: 'Von Alexander dem Großen 331 v. Chr. gegründet, wurde Alexandria zur intellektuellen Hauptstadt der antiken Welt. Seine Bibliothek fasste bis zu 700.000 Schriftrollen. Der Leuchtturm von Alexandria war eines der Sieben Weltwunder. Kleopatra VII. herrschte hier als letzte Pharaonin Ägyptens.',
        funFact: 'Die Bibliothek von Alexandria verpflichtete alle im Hafen anlegenden Schiffe, ihre Schriftrollen abzugeben; diese wurden kopiert, die Kopien an die Schiffe zurückgegeben, während Alexandria die Originale behielt.',
      },
      es: {
        description: 'Fundada por Alejandro Magno en 331 a.C., Alejandría se convirtió en la capital intelectual del mundo antiguo. Su Biblioteca albergaba hasta 700.000 rollos. El Faro de Alejandría era una de las Siete Maravillas. Cleopatra VII gobernó aquí, la última faraona de Egipto.',
        funFact: 'La Biblioteca de Alejandría obligaba a todos los barcos que atracaban en el puerto a entregar los rollos que transportaban; se copiaban y las copias se devolvían a los barcos, mientras Alejandría conservaba los originales.',
      },
    },
  },
  {
    id: 'memphis',
    name: 'Memphis',
    civilization: 'Ancient Egypt',
    period: '3100–7th century AD',
    peakPopulation: '500,000 (1500 BC)',
    latitude: 29.8480,
    longitude: 31.2516,
    emoji: '🔺',
    color: '#D97706',
    description: 'Capital of unified Egypt for over 2,000 years, Memphis stood at the apex of the Nile Delta. The pyramids of Giza and Saqqara (including the Step Pyramid, the world\'s first stone monument) lie within its ancient territory. The Sphinx gazes from the plateau above.',
    funFact: 'The city\'s name in ancient Egyptian was "Inbu-Hedj" meaning "White Walls." Memphis became so famous that the state of Tennessee was named after it via Napoleonic-era Egyptomania.',
    status: 'ruins',
    translations: {
      ro: {
        description: 'Capitala Egiptului unificat timp de peste 2.000 de ani, Memphis se afla la vârful Deltei Nilului. Piramidele de la Giza și Saqqara (inclusiv Piramida în Trepte, primul monument de piatră din lume) se aflau pe teritoriul său antic. Sfinxul privește de pe platoul de deasupra.',
        funFact: 'Numele orașului în egipteana antică era „Inbu-Hedj", adică „Ziduri Albe". Memphis a devenit atât de celebru încât statul Tennessee i-a preluat numele în epoca egiptofiliei napoleoniene.',
      },
      fr: {
        description: 'Capitale de l\'Égypte unifiée pendant plus de 2 000 ans, Memphis était située à l\'apex du delta du Nil. Les pyramides de Gizeh et de Saqqarah (dont la Pyramide à degrés, premier monument en pierre au monde) se trouvaient sur son territoire antique. Le Sphinx veille depuis le plateau en surplomb.',
        funFact: 'Le nom de la ville en égyptien ancien était « Inbu-Hedj », signifiant « Murs Blancs ». Memphis devint si célèbre que l\'État du Tennessee lui doit son nom, fruit de l\'égyptomanie de l\'ère napoléonienne.',
      },
      de: {
        description: 'Als Hauptstadt des vereinigten Ägyptens für über 2.000 Jahre lag Memphis an der Spitze des Nildeltas. Die Pyramiden von Gizeh und Sakkara (darunter die Stufenpyramide, das erste Steinmonument der Welt) befanden sich auf seinem antiken Territorium. Die Sphinx blickt vom Plateau darüber.',
        funFact: 'Der Name der Stadt lautete im Altägyptischen „Inbu-Hedj", was „Weiße Mauern" bedeutet. Memphis wurde so berühmt, dass der Bundesstaat Tennessee in der napoleonischen Ägyptomanie nach ihr benannt wurde.',
      },
      es: {
        description: 'Capital del Egipto unificado durante más de 2.000 años, Menfis se encontraba en el vértice del delta del Nilo. Las pirámides de Guiza y Saqqara (incluida la Pirámide Escalonada, el primer monumento de piedra del mundo) se encontraban en su territorio antiguo. La Esfinge contempla desde la meseta superior.',
        funFact: 'El nombre de la ciudad en egipcio antiguo era «Inbu-Hedj», que significa «Muros Blancos». Menfis se hizo tan famosa que el estado de Tennessee recibió su nombre durante la egiptomanía de la era napoleónica.',
      },
    },
  },
  {
    id: 'teotihuacan',
    name: 'Teotihuacán',
    civilization: 'Unknown (pre-Aztec Mesoamerican)',
    period: '100 BC – 550 AD',
    peakPopulation: '200,000 (450 AD)',
    latitude: 19.6925,
    longitude: -98.8438,
    emoji: '🌋',
    color: '#059669',
    description: 'One of the largest cities of the ancient world, Teotihuacán\'s identity remains mysterious — we don\'t even know what its inhabitants called themselves. The city\'s Pyramid of the Sun is the third-largest pyramid ever built. Its influence spread throughout Mesoamerica.',
    funFact: 'The city was suddenly abandoned around 550 AD for unknown reasons. Evidence suggests the elite buildings were deliberately burned — possibly a revolt against the ruling class.',
    status: 'ruins',
    translations: {
      ro: {
        description: 'Unul dintre cele mai mari orașe ale lumii antice, identitatea Teotihuacanului rămâne misterioasă — nici măcar nu știm cum se numeau locuitorii săi. Piramida Soarelui din oraș este a treia cea mai mare piramidă construită vreodată. Influența sa s-a extins în toată Mezoamerica.',
        funFact: 'Orașul a fost abandonat brusc în jurul anului 550 d.Hr. din motive necunoscute. Dovezile sugerează că edificiile elitei au fost incendiate deliberat — probabil o revoltă împotriva clasei conducătoare.',
      },
      fr: {
        description: 'L\'une des plus grandes villes du monde antique, l\'identité de Teotihuacán reste mystérieuse — nous ne savons même pas comment ses habitants se nommaient. La Pyramide du Soleil est la troisième plus grande pyramide jamais construite. Son influence s\'est étendue à toute la Mésoamérique.',
        funFact: 'La ville fut soudainement abandonnée vers 550 ap. J.-C. pour des raisons inconnues. Des preuves suggèrent que les bâtiments de l\'élite furent délibérément incendiés — peut-être lors d\'une révolte contre la classe dirigeante.',
      },
      de: {
        description: 'Eine der größten Städte der antiken Welt, deren Identität rätselhaft bleibt — wir wissen nicht einmal, wie ihre Bewohner sich selbst nannten. Die Sonnenpyramide der Stadt ist die drittgrößte jemals gebaute Pyramide. Ihr Einfluss erstreckte sich über ganz Mesoamerika.',
        funFact: 'Die Stadt wurde um 550 n. Chr. aus unbekannten Gründen plötzlich verlassen. Belege deuten darauf hin, dass die Gebäude der Elite absichtlich niedergebrannt wurden — möglicherweise ein Aufstand gegen die herrschende Klasse.',
      },
      es: {
        description: 'Una de las ciudades más grandes del mundo antiguo, la identidad de Teotihuacán sigue siendo misteriosa: ni siquiera sabemos cómo se llamaban a sí mismos sus habitantes. La Pirámide del Sol es la tercera más grande jamás construida. Su influencia se extendió por toda Mesoamérica.',
        funFact: 'La ciudad fue abandonada súbitamente hacia el año 550 d.C. por razones desconocidas. Las evidencias sugieren que los edificios de la élite fueron incendiados deliberadamente, posiblemente durante una revuelta contra la clase gobernante.',
      },
    },
  },
  {
    id: 'persepolis',
    name: 'Persepolis',
    civilization: 'Achaemenid Persian Empire',
    period: '518–330 BC',
    peakPopulation: '100,000',
    latitude: 29.9353,
    longitude: 52.8912,
    emoji: '👑',
    color: '#C026D3',
    description: 'The ceremonial capital of the Persian Empire, built by Darius the Great and expanded by Xerxes. Delegations from all 28 subject nations brought tribute to the Apadana hall. Alexander the Great burned the city in 330 BC — reportedly during a drunken party at the urging of his companion Thaïs.',
    funFact: 'Archaeological excavations found over 30,000 clay tablets recording the wages paid to workers who built Persepolis — including skilled foreign craftsmen who were paid in silver and wine.',
    status: 'ruins',
    translations: {
      ro: {
        description: 'Capitala ceremonială a Imperiului Persan, construită de Darius cel Mare și extinsă de Xerxes. Delegații din toate cele 28 de națiuni supuse aduceau tribut în sala Apadana. Alexandru cel Mare a ars orașul în 330 î.Hr. — se spune că în timpul unei petreceri cu băuturi la îndemnul tovarășei sale Thaïs.',
        funFact: 'Excavațiile arheologice au descoperit peste 30.000 de tăblițe de lut care înregistrau salariile plătite muncitorilor ce au construit Persepolis — inclusiv meșteri străini calificați plătiți cu argint și vin.',
      },
      fr: {
        description: 'La capitale cérémonielle de l\'Empire perse, bâtie par Darius le Grand et agrandie par Xerxès. Des délégations des 28 nations sujettes apportaient leur tribut dans la salle de l\'Apadana. Alexandre le Grand brûla la ville en 330 av. J.-C. — prétendument lors d\'une fête arrosée, à l\'instigation de sa compagne Thaïs.',
        funFact: 'Les fouilles archéologiques ont mis au jour plus de 30 000 tablettes d\'argile enregistrant les salaires versés aux ouvriers qui ont construit Persépolis — dont des artisans étrangers qualifiés payés en argent et en vin.',
      },
      de: {
        description: 'Die Zeremonialhauptstadt des Persischen Reiches, erbaut von Darius dem Großen und erweitert von Xerxes. Delegationen aller 28 unterworfenen Völker brachten Tribut in die Apadana-Halle. Alexander der Große brannte die Stadt 330 v. Chr. nieder — angeblich während eines Trinkgelages auf Betreiben seiner Gefährtin Thaïs.',
        funFact: 'Archäologische Ausgrabungen fanden über 30.000 Tontafeln, die die Löhne der Bauarbeiter von Persepolis aufzeichneten — darunter qualifizierte ausländische Handwerker, die in Silber und Wein bezahlt wurden.',
      },
      es: {
        description: 'La capital ceremonial del Imperio Persa, construida por Darío el Grande y ampliada por Jerjes. Delegaciones de las 28 naciones sometidas llevaban tributos a la sala de la Apadana. Alejandro Magno incendió la ciudad en 330 a.C., supuestamente durante una fiesta con mucho vino a instancias de su compañera Taís.',
        funFact: 'Las excavaciones arqueológicas encontraron más de 30.000 tablillas de arcilla que registraban los salarios pagados a los trabajadores que construyeron Persépolis, incluidos artesanos extranjeros cualificados que cobraban en plata y vino.',
      },
    },
  },
  {
    id: 'troy',
    name: 'Troy (Ilium)',
    civilization: 'Bronze Age Anatolian',
    period: '3000–400 BC',
    peakPopulation: '10,000',
    latitude: 39.9571,
    longitude: 26.2388,
    emoji: '🐎',
    color: '#BE185D',
    description: 'Homer\'s Troy — city of the legendary Trojan War, of Achilles and Hector, the Wooden Horse and Helen. Rediscovered by Heinrich Schliemann in 1870 in modern Turkey, Troy was actually nine successive cities built atop each other. Troy VI or VIIa is likely the city of the Trojan War.',
    funFact: 'Schliemann was so impatient to find Homer\'s Troy that he dug straight through the actual Trojan War layer to an older city — and only realized his mistake years later.',
    status: 'ruins',
    translations: {
      ro: {
        description: 'Troia lui Homer — orașul legendarului Război Troian, al lui Ahile și Hector, al Calului de Lemn și al Elenei. Redescoperită de Heinrich Schliemann în 1870 în Turcia modernă, Troia era de fapt nouă orașe succesive construite unul peste altul. Troia VI sau VIIa este probabil orașul Războiului Troian.',
        funFact: 'Schliemann era atât de nerăbdător să găsească Troia lui Homer încât a săpat direct prin stratul Războiului Troian ajungând la un oraș mai vechi — și și-a dat seama de greșeală abia câțiva ani mai târziu.',
      },
      fr: {
        description: 'La Troie d\'Homère — ville de la légendaire Guerre de Troie, d\'Achille et Hector, du Cheval de Troie et d\'Hélène. Redécouverte par Heinrich Schliemann en 1870 dans la Turquie actuelle, Troie était en réalité neuf villes successives bâties l\'une sur l\'autre. Troie VI ou VIIa est vraisemblablement la ville de la Guerre de Troie.',
        funFact: 'Schliemann était si impatient de trouver la Troie d\'Homère qu\'il creusa en traversant directement la couche de la Guerre de Troie pour atteindre une ville plus ancienne — et ne réalisa son erreur que des années plus tard.',
      },
      de: {
        description: 'Homers Troja — Stadt des legendären Trojanischen Krieges, von Achilles und Hektor, dem Trojanischen Pferd und Helena. Von Heinrich Schliemann 1870 in der heutigen Türkei wiederentdeckt, war Troja tatsächlich neun aufeinanderfolgende Städte, die übereinander errichtet wurden. Troja VI oder VIIa ist wahrscheinlich die Stadt des Trojanischen Krieges.',
        funFact: 'Schliemann war so ungeduldig, Homers Troja zu finden, dass er direkt durch die eigentliche Trojanische Kriegsschicht in eine ältere Stadt grub — und seinen Fehler erst Jahre später bemerkte.',
      },
      es: {
        description: 'La Troya de Homero: ciudad de la legendaria Guerra de Troya, de Aquiles y Héctor, del Caballo de Madera y de Helena. Redescubierta por Heinrich Schliemann en 1870 en la actual Turquía, Troya era en realidad nueve ciudades sucesivas construidas una encima de otra. Troya VI o VIIa es probablemente la ciudad de la Guerra de Troya.',
        funFact: 'Schliemann estaba tan impaciente por encontrar la Troya de Homero que excavó directamente a través del estrato de la Guerra de Troya llegando a una ciudad más antigua, y solo se dio cuenta de su error años después.',
      },
    },
  },
  {
    id: 'mohenjodaro',
    name: 'Mohenjo-daro',
    civilization: 'Indus Valley Civilization',
    period: '2500–1700 BC',
    peakPopulation: '40,000',
    latitude: 27.3241,
    longitude: 68.1375,
    emoji: '🏘️',
    color: '#EA580C',
    description: 'One of the world\'s earliest urban settlements, Mohenjo-daro had sophisticated urban planning with a grid street layout, advanced drainage, a "Great Bath," and standardized brick sizes — all without a visible royal palace or temple. The Indus script has never been deciphered.',
    funFact: 'Every house in Mohenjo-daro had access to the city\'s drainage system — a sanitation level not matched in Europe until the 1800s, some 3,500 years later.',
    status: 'ruins',
    translations: {
      ro: {
        description: 'Una dintre cele mai vechi așezări urbane din lume, Mohenjo-daro dispunea de planificare urbană sofisticată cu un plan stradal în grilă, canalizare avansată, o „Mare Baie" și dimensiuni standardizate ale cărămizilor — toate acestea fără un palat regal sau templu vizibil. Scrierea Indusului nu a fost niciodată descifrată.',
        funFact: 'Fiecare casă din Mohenjo-daro avea acces la sistemul de canalizare al orașului — un nivel de salubritate care nu a fost atins în Europa decât în anii 1800, cu aproximativ 3.500 de ani mai târziu.',
      },
      fr: {
        description: 'L\'une des premières implantations urbaines au monde, Mohenjo-daro possédait un urbanisme sophistiqué avec un plan en grille, un réseau d\'égouts avancé, un « Grand Bain » et des dimensions de briques standardisées — le tout sans palais royal ni temple visible. L\'écriture de l\'Indus n\'a jamais été déchiffrée.',
        funFact: 'Chaque maison de Mohenjo-daro était reliée au réseau d\'égouts de la ville — un niveau d\'assainissement qui ne sera égalé en Europe qu\'au XIXe siècle, soit quelque 3 500 ans plus tard.',
      },
      de: {
        description: 'Eine der frühesten städtischen Siedlungen der Welt, Mohenjo-daro besaß eine ausgeklügelte Stadtplanung mit einem Rasterstraßennetz, fortschrittlicher Kanalisation, einem „Großen Bad" und standardisierten Ziegelgrößen — alles ohne sichtbaren Königspalast oder Tempel. Die Indusschrift wurde bis heute nicht entziffert.',
        funFact: 'Jedes Haus in Mohenjo-daro hatte Zugang zum Kanalisationssystem der Stadt — ein Hygieneniveau, das in Europa erst in den 1800er Jahren, rund 3.500 Jahre später, erreicht wurde.',
      },
      es: {
        description: 'Uno de los asentamientos urbanos más antiguos del mundo, Mohenjo-daro contaba con una sofisticada planificación urbana con calles en cuadrícula, alcantarillado avanzado, un «Gran Baño» y tamaños de ladrillo estandarizados, todo ello sin ningún palacio real ni templo visible. La escritura del Indo nunca ha sido descifrada.',
        funFact: 'Cada casa de Mohenjo-daro tenía acceso al sistema de alcantarillado de la ciudad, un nivel sanitario que Europa no alcanzaría hasta el siglo XIX, unos 3.500 años después.',
      },
    },
  },
  {
    id: 'angkor',
    name: 'Angkor',
    civilization: 'Khmer Empire',
    period: '802–1431 AD',
    peakPopulation: '1,000,000 (1000 AD)',
    latitude: 13.4125,
    longitude: 103.8670,
    emoji: '🌿',
    color: '#15803D',
    description: 'The largest pre-industrial city on Earth, Angkor at its peak housed possibly 1 million people and its hydraulic network of reservoirs and canals irrigated a vast rice-growing region. Angkor Wat, built by Suryavarman II, remains the world\'s largest religious monument.',
    funFact: 'LiDAR (aerial laser scanning) technology revealed that Angkor\'s sprawl was even larger than thought — the city covered 1,000 square kilometers, larger than modern Los Angeles.',
    status: 'ruins',
    translations: {
      ro: {
        description: 'Cel mai mare oraș pre-industrial de pe Pământ, Angkor adăpostea la apogeu poate 1 milion de oameni, iar rețeaua sa hidraulică de rezervoare și canale iriga o vastă regiune producătoare de orez. Angkor Wat, construit de Suryavarman al II-lea, rămâne cel mai mare monument religios din lume.',
        funFact: 'Tehnologia LiDAR (scanare laser aeriană) a dezvăluit că întinderea Angkorului era chiar mai mare decât se credea — orașul acoperea 1.000 de kilometri pătrați, mai mult decât Los Angelesul modern.',
      },
      fr: {
        description: 'La plus grande ville pré-industrielle de la Terre, Angkor abritait à son apogée peut-être 1 million de personnes, et son réseau hydraulique de réservoirs et de canaux irriguait une vaste région rizicole. Angkor Vat, construit par Suryavarman II, reste le plus grand monument religieux du monde.',
        funFact: 'La technologie LiDAR (balayage laser aérien) a révélé qu\'Angkor était encore plus étendu qu\'on ne le pensait — la ville couvrait 1 000 kilomètres carrés, plus grand que Los Angeles aujourd\'hui.',
      },
      de: {
        description: 'Die größte vorindustrielle Stadt der Erde, Angkor beherbergte auf ihrem Höhepunkt möglicherweise 1 Million Menschen; ihr hydraulisches Netz aus Stauseen und Kanälen bewässerte eine ausgedehnte Reisanbauregion. Angkor Wat, von Suryavarman II. erbaut, ist das größte religiöse Bauwerk der Welt.',
        funFact: 'Die LiDAR-Technologie (Luftlaserscan) enthüllte, dass Angkors Ausdehnung noch größer war als angenommen — die Stadt bedeckte 1.000 Quadratkilometer, größer als das heutige Los Angeles.',
      },
      es: {
        description: 'La ciudad preindustrial más grande de la Tierra, Angkor albergaba en su apogeo posiblemente 1 millón de personas, y su red hidráulica de embalses y canales irrigaba una vasta región arrocera. Angkor Wat, construido por Suryavarman II, sigue siendo el mayor monumento religioso del mundo.',
        funFact: 'La tecnología LiDAR (escaneo láser aéreo) reveló que la extensión de Angkor era aún mayor de lo que se pensaba: la ciudad cubría 1.000 kilómetros cuadrados, más grande que el Los Ángeles moderno.',
      },
    },
  },
  {
    id: 'tikal',
    name: 'Tikal',
    civilization: 'Classic Maya',
    period: '200 BC – 900 AD',
    peakPopulation: '100,000',
    latitude: 17.2220,
    longitude: -89.6237,
    emoji: '🦅',
    color: '#065F46',
    description: 'The greatest city of the Classic Maya world, Tikal\'s six massive pyramids rise above the Guatemalan jungle canopy. A sophisticated city-state with monumental architecture, astronomy, calendrical systems, and hieroglyphic writing, Tikal mysteriously collapsed around 900 AD.',
    funFact: 'Tikal was used as the location for the Rebel Base on Yavin 4 in the original Star Wars film. The jungle acoustics around the temples are so precise that sounds are perfectly channeled from the top to the bottom.',
    status: 'ruins',
    translations: {
      ro: {
        description: 'Cel mai mare oraș din lumea maya clasică, cele șase piramide masive ale Tikalului se înalță deasupra canopiei junglei guatemaleze. Un oraș-stat sofisticat cu arhitectură monumentală, astronomie, sisteme calendaristice și scriere hieroglifică, Tikal a dispărut misterios în jurul anului 900 d.Hr.',
        funFact: 'Tikal a fost folosit ca locație pentru Baza Rebelilor de pe Yavin 4 în filmul original Star Wars. Acustica junglei din jurul templelor este atât de precisă încât sunetele sunt perfect canalizate de sus în jos.',
      },
      fr: {
        description: 'La plus grande ville du monde maya classique, les six immenses pyramides de Tikal s\'élèvent au-dessus de la canopée de la jungle guatémaltèque. Cité-État sophistiquée dotée d\'une architecture monumentale, d\'une astronomie, de systèmes calendaires et d\'une écriture hiéroglyphique, Tikal s\'effondra mystérieusement vers 900 ap. J.-C.',
        funFact: 'Tikal a servi de décor à la Base Rebelle sur Yavin 4 dans le film Star Wars original. L\'acoustique de la jungle autour des temples est si précise que les sons sont parfaitement canalisés du sommet vers la base.',
      },
      de: {
        description: 'Die größte Stadt der klassischen Maya-Welt — Tikals sechs riesige Pyramiden ragen über das Blätterdach des guatemaltekischen Dschungels. Ein hochentwickelter Stadtstaat mit monumentaler Architektur, Astronomie, Kalendersystemen und Hieroglyphenschrift kollabierte Tikal um 900 n. Chr. auf rätselhafte Weise.',
        funFact: 'Tikal diente als Kulisse für den Rebellenstützpunkt auf Yavin 4 im Original-Starwars-Film. Die Dschungelakustik rund um die Tempel ist so präzise, dass Klänge vom Gipfel bis zum Fuß perfekt übertragen werden.',
      },
      es: {
        description: 'La mayor ciudad del mundo maya clásico, las seis enormes pirámides de Tikal se elevan sobre el dosel de la selva guatemalteca. Una sofisticada ciudad-estado con arquitectura monumental, astronomía, sistemas calendáricos y escritura jeroglífica, Tikal colapsó misteriosamente hacia el año 900 d.C.',
        funFact: 'Tikal fue utilizado como escenario de la Base Rebelde en Yavin 4 en la película original de Star Wars. La acústica de la selva alrededor de los templos es tan precisa que los sonidos se transmiten perfectamente de arriba hacia abajo.',
      },
    },
  },
  {
    id: 'constantinople',
    name: 'Constantinople',
    civilization: 'Byzantine Empire / Ottoman',
    period: '330 AD – present (as Istanbul)',
    peakPopulation: '800,000 (500 AD)',
    latitude: 41.0082,
    longitude: 28.9784,
    emoji: '🕌',
    color: '#9D174D',
    description: 'Founded by Constantine the Great as the "New Rome," Constantinople was the capital of the Byzantine Empire for over 1,000 years. It fell to the Ottoman Turks in 1453, ending the Eastern Roman Empire. Today it is Istanbul, Turkey\'s largest city.',
    funFact: 'The city had the Hippodrome, a chariot racing stadium seating 100,000 spectators. The stadium was also the site of the Nika riots in 532 AD, in which 30,000 people died in a single sports-related uprising.',
    status: 'modern_city',
    translations: {
      ro: {
        description: 'Fondată de Constantin cel Mare drept „Noua Romă", Constantinopolul a fost capitala Imperiului Bizantin timp de peste 1.000 de ani. A căzut în mâinile turcilor otomani în 1453, punând capăt Imperiului Roman de Răsărit. Astăzi este Istanbulul, cel mai mare oraș al Turciei.',
        funFact: 'Orașul deținea Hipodromul, un stadion de curse de care cu capacitate pentru 100.000 de spectatori. Stadionul a fost și locul Revoltelor Nika din 532 d.Hr., în care 30.000 de oameni și-au pierdut viața într-o singură insurecție sportivă.',
      },
      fr: {
        description: 'Fondée par Constantin le Grand comme la « Nouvelle Rome », Constantinople fut la capitale de l\'Empire byzantin pendant plus de 1 000 ans. Elle tomba aux mains des Turcs ottomans en 1453, mettant fin à l\'Empire romain d\'Orient. Aujourd\'hui, c\'est Istanbul, la plus grande ville de Turquie.',
        funFact: 'La ville possédait l\'Hippodrome, un stade de courses de chars pouvant accueillir 100 000 spectateurs. Le stade fut aussi le théâtre des émeutes de Nika en 532 ap. J.-C., au cours desquelles 30 000 personnes périrent lors d\'un seul soulèvement lié au sport.',
      },
      de: {
        description: 'Von Konstantin dem Großen als „Neues Rom" gegründet, war Konstantinopel über 1.000 Jahre lang die Hauptstadt des Byzantinischen Reiches. Es fiel 1453 an die Osmanen und beendete damit das Oströmische Reich. Heute ist es Istanbul, Türkeis größte Stadt.',
        funFact: 'Die Stadt besaß den Hippodrom, ein Wagenrennstadion mit 100.000 Plätzen. Das Stadion war auch Schauplatz der Nika-Aufstände von 532 n. Chr., bei denen 30.000 Menschen in einem einzigen sportbezogenen Aufstand ums Leben kamen.',
      },
      es: {
        description: 'Fundada por Constantino el Grande como la «Nueva Roma», Constantinopla fue la capital del Imperio Bizantino durante más de 1.000 años. Cayó ante los turcos otomanos en 1453, poniendo fin al Imperio Romano de Oriente. Hoy es Estambul, la ciudad más grande de Turquía.',
        funFact: 'La ciudad contaba con el Hipódromo, un estadio de carreras de carros con capacidad para 100.000 espectadores. El estadio también fue el escenario de los disturbios de Nika en 532 d.C., en los que 30.000 personas murieron en un único levantamiento relacionado con el deporte.',
      },
    },
  },
  {
    id: 'machu_picchu',
    name: 'Machu Picchu',
    civilization: 'Inca Empire',
    period: '1450–1572 AD',
    peakPopulation: '750',
    latitude: -13.1631,
    longitude: -72.5450,
    emoji: '🏔️',
    color: '#92400E',
    description: 'Built at 2,430 meters in the Peruvian Andes by the Inca Emperor Pachacuti, Machu Picchu was abandoned less than a century after construction, likely due to smallpox and Spanish conquest. Its precise stonework, astronomical alignments, and spectacular location make it one of history\'s most extraordinary achievements.',
    funFact: 'Machu Picchu\'s stones are fit together so precisely — without mortar — that a knife blade cannot be inserted between them. The city survived centuries of earthquakes that destroyed later Spanish colonial structures.',
    status: 'ruins',
    translations: {
      ro: {
        description: 'Construit la 2.430 de metri în Anzii peruvieni de împăratul inca Pachacuti, Machu Picchu a fost abandonat la mai puțin de un secol după construcție, probabil din cauza variolei și a cuceririi spaniole. Lucrările sale de piatră precise, aliniamentele astronomice și locația spectaculoasă îl fac una dintre cele mai extraordinare realizări din istorie.',
        funFact: 'Pietrele din Machu Picchu sunt îmbinate atât de precis — fără mortar — încât nu poate fi introdus nicio lamă de cuțit între ele. Orașul a rezistat secole de cutremure care au distrus structuri coloniale spaniole construite ulterior.',
      },
      fr: {
        description: 'Construite à 2 430 mètres dans les Andes péruviennes par l\'Inca Pachacuti, le Machu Picchu fut abandonné moins d\'un siècle après sa construction, probablement en raison de la variole et de la conquête espagnole. La précision de sa maçonnerie, ses alignements astronomiques et son site spectaculaire en font l\'une des réalisations les plus extraordinaires de l\'histoire.',
        funFact: 'Les pierres du Machu Picchu sont assemblées avec une telle précision — sans mortier — qu\'une lame de couteau ne peut pas être insérée entre elles. La cité a survécu à des siècles de séismes qui ont détruit des structures coloniales espagnoles construites plus tard.',
      },
      de: {
        description: 'Auf 2.430 Metern in den peruanischen Anden vom Inka-Kaiser Pachacuti erbaut, wurde Machu Picchu weniger als ein Jahrhundert nach seiner Errichtung verlassen, wahrscheinlich wegen der Pocken und der spanischen Eroberung. Die präzise Steinmetzarbeit, die astronomischen Ausrichtungen und die spektakuläre Lage machen es zu einer der außergewöhnlichsten Leistungen der Geschichte.',
        funFact: 'Die Steine von Machu Picchu sind so präzise — ohne Mörtel — zusammengefügt, dass keine Klingenspitze zwischen sie passt. Die Stadt überstand Jahrhunderte von Erdbeben, die spätere spanische Kolonialbauten zerstörten.',
      },
      es: {
        description: 'Construida a 2.430 metros en los Andes peruanos por el emperador inca Pachacuti, Machu Picchu fue abandonada menos de un siglo después de su construcción, probablemente a causa de la viruela y la conquista española. Su precisa cantería, sus alineaciones astronómicas y su espectacular ubicación la convierten en uno de los logros más extraordinarios de la historia.',
        funFact: 'Las piedras de Machu Picchu están ensambladas con tanta precisión —sin mortero— que no se puede introducir una hoja de cuchillo entre ellas. La ciudad sobrevivió siglos de terremotos que destruyeron estructuras coloniales españolas posteriores.',
      },
    },
  },
  {
    id: 'nineveh',
    name: 'Nineveh',
    civilization: 'Assyrian Empire',
    period: '3000–612 BC',
    peakPopulation: '150,000 (700 BC)',
    latitude: 36.3592,
    longitude: 43.1531,
    emoji: '🦁',
    color: '#D97706',
    description: 'The largest city in the world around 700 BC under Sennacherib, Nineveh featured the magnificent Palace Without Rival, advanced aqueducts bringing water from 80km away, and the legendary Library of Ashurbanipal — the world\'s first library, containing 30,000 clay tablets.',
    funFact: 'The Library of Ashurbanipal preserved the Epic of Gilgamesh — one of humanity\'s oldest literary works — for 2,600 years in the ruins of Nineveh until rediscovered in 1849.',
    status: 'ruins',
    translations: {
      ro: {
        description: 'Cel mai mare oraș din lume în jurul anului 700 î.Hr., sub Senaherib, Ninive se mândrea cu magnificul Palat Fără Rival, apeducte avansate care aduceau apă de la 80 km distanță și legendara Bibliotecă a lui Assurbanipal — prima bibliotecă din lume, cu 30.000 de tăblițe de lut.',
        funFact: 'Biblioteca lui Assurbanipal a conservat Epopeea lui Ghilgameș — una dintre cele mai vechi opere literare ale omenirii — timp de 2.600 de ani în ruinele Ninivei, până la redescoperirea sa în 1849.',
      },
      fr: {
        description: 'La plus grande ville du monde vers 700 av. J.-C. sous Sennachérib, Ninive abritait le magnifique Palais Sans Égal, des aqueducs avancés apportant l\'eau depuis 80 km, et la légendaire Bibliothèque d\'Assurbanipal — la première bibliothèque au monde, contenant 30 000 tablettes d\'argile.',
        funFact: 'La Bibliothèque d\'Assurbanipal a préservé l\'Épopée de Gilgamesh — l\'une des plus anciennes œuvres littéraires de l\'humanité — pendant 2 600 ans dans les ruines de Ninive, jusqu\'à sa redécouverte en 1849.',
      },
      de: {
        description: 'Die größte Stadt der Welt um 700 v. Chr. unter Sanherib, Ninive besaß den prächtigen „Palast ohne Gleichen", fortschrittliche Aquädukte, die Wasser aus 80 km Entfernung heranführten, und die legendäre Bibliothek Assurbanipals — die erste Bibliothek der Welt mit 30.000 Tontafeln.',
        funFact: 'Die Bibliothek Assurbanipals bewahrte das Gilgamesch-Epos — eines der ältesten Literaturwerke der Menschheit — 2.600 Jahre lang in den Ruinen Ninives, bis es 1849 wiederentdeckt wurde.',
      },
      es: {
        description: 'La ciudad más grande del mundo hacia el 700 a.C. bajo Senaquerib, Nínive lucía el magnífico Palacio Sin Rival, acueductos avanzados que traían agua desde 80 km de distancia y la legendaria Biblioteca de Asurbanipal, la primera biblioteca del mundo con 30.000 tablillas de arcilla.',
        funFact: 'La Biblioteca de Asurbanipal preservó la Epopeya de Gilgamesh —una de las obras literarias más antiguas de la humanidad— durante 2.600 años entre las ruinas de Nínive, hasta su redescubrimiento en 1849.',
      },
    },
  },
  {
    id: 'chichen_itza',
    name: 'Chichén Itzá',
    civilization: 'Maya / Toltec',
    period: '600–1200 AD',
    peakPopulation: '50,000',
    latitude: 20.6843,
    longitude: -88.5678,
    emoji: '🐍',
    color: '#0F766E',
    description: 'One of the greatest Maya cities, Chichén Itzá was a major focal point of the Maya world and contains some of its most impressive architecture. El Castillo pyramid creates a shadow serpent during equinoxes. The Great Ball Court is the largest in Mesoamerica.',
    funFact: 'During the spring and fall equinoxes, the setting sun creates triangular shadows on El Castillo that combine with the carved serpent head at the base — appearing to make a serpent descend the pyramid. This astronomical precision was intentional.',
    status: 'ruins',
    translations: {
      ro: {
        description: 'Unul dintre cele mai mari orașe maya, Chichén Itzá era un important punct focal al lumii maya și conține unele dintre cele mai impresionante arhitecturi ale sale. Piramida El Castillo creează un șarpe de umbră în timpul echinoxurilor. Marele Teren de Joc este cel mai mare din Mezoamerica.',
        funFact: 'În timpul echinoxurilor de primăvară și toamnă, soarele la asfințit creează umbre triunghiulare pe El Castillo care se combină cu capul de șarpe sculptat de la bază — dând impresia că un șarpe coboară piramida. Această precizie astronomică a fost intenționată.',
      },
      fr: {
        description: 'L\'une des plus grandes villes mayas, Chichén Itzá était un important foyer du monde maya et renferme certaines de ses architectures les plus impressionnantes. La pyramide El Castillo crée une ombre en forme de serpent lors des équinoxes. Le Grand Terrain de Jeu de Balle est le plus grand de Mésoamérique.',
        funFact: 'Lors des équinoxes de printemps et d\'automne, le soleil couchant projette des ombres triangulaires sur El Castillo qui se combinent avec la tête de serpent sculptée à la base — donnant l\'impression qu\'un serpent descend la pyramide. Cette précision astronomique était intentionnelle.',
      },
      de: {
        description: 'Eine der größten Maya-Städte, Chichén Itzá war ein bedeutender Mittelpunkt der Maya-Welt und enthält einige ihrer beeindruckendsten Bauten. Die Pyramide El Castillo erzeugt bei den Äquinoktien einen Schlangenschatten. Der Große Ballspielplatz ist der größte in Mesoamerika.',
        funFact: 'Bei den Frühjahrs- und Herbst-Äquinoktien erzeugt die untergehende Sonne dreieckige Schatten auf El Castillo, die sich mit dem geschnitzten Schlangenkopf an der Basis verbinden — und so aussehen, als würde eine Schlange die Pyramide herabsteigen. Diese astronomische Präzision war beabsichtigt.',
      },
      es: {
        description: 'Una de las mayores ciudades mayas, Chichén Itzá era un importante centro del mundo maya y alberga algunas de sus arquitecturas más impresionantes. La pirámide de El Castillo crea una serpiente de sombra durante los equinoccios. El Gran Juego de Pelota es el más grande de Mesoamérica.',
        funFact: 'Durante los equinoccios de primavera y otoño, el sol poniente crea sombras triangulares en El Castillo que se combinan con la cabeza de serpiente tallada en la base, haciendo que parezca que una serpiente desciende la pirámide. Esta precisión astronómica fue intencional.',
      },
    },
  },
  {
    id: 'great_zimbabwe',
    name: 'Great Zimbabwe',
    civilization: 'Kingdom of Zimbabwe',
    period: '1100–1450 AD',
    peakPopulation: '18,000',
    latitude: -20.2698,
    longitude: 30.9344,
    emoji: '🌍',
    color: '#65A30D',
    description: 'The largest stone structure in sub-Saharan Africa, Great Zimbabwe was the capital of the Kingdom of Zimbabwe. Its massive granite walls, some 11 meters high and 5 meters thick, were constructed without mortar using dry-stone technique. The city was a major trading center linking Africa\'s interior to Indian Ocean ports.',
    funFact: 'When Europeans first encountered Great Zimbabwe in the 19th century, many refused to believe Africans could have built it — fabricating false theories about Phoenicians or lost Israelite tribes. Archaeological evidence definitively proves it was built by the Shona people.',
    status: 'ruins',
    translations: {
      ro: {
        description: 'Cea mai mare structură de piatră din Africa sub-sahariană, Marele Zimbabwe era capitala Regatului Zimbabwe. Masivele sale ziduri de granit, unele de 11 metri înălțime și 5 metri grosime, au fost construite fără mortar folosind tehnica zidăriei uscate. Orașul era un important centru comercial care lega interiorul Africii de porturile Oceanului Indian.',
        funFact: 'Când europenii au întâlnit pentru prima dată Marele Zimbabwe în secolul al XIX-lea, mulți au refuzat să creadă că africanii l-ar fi putut construi — inventând teorii false despre fenicieni sau triburi israelite pierdute. Dovezile arheologice demonstrează definitiv că a fost construit de poporul Shona.',
      },
      fr: {
        description: 'La plus grande structure en pierre d\'Afrique subsaharienne, le Grand Zimbabwe était la capitale du Royaume du Zimbabwe. Ses imposants murs de granit, certains atteignant 11 mètres de haut et 5 mètres d\'épaisseur, furent élevés sans mortier selon la technique du pierrage à sec. La cité était un grand centre commercial reliant l\'intérieur de l\'Afrique aux ports de l\'océan Indien.',
        funFact: 'Lorsque les Européens découvrirent le Grand Zimbabwe au XIXe siècle, beaucoup refusèrent de croire que des Africains avaient pu le bâtir — inventant de fausses théories sur des Phéniciens ou des tribus israélites perdues. Les preuves archéologiques démontrent sans équivoque qu\'il fut construit par le peuple Shona.',
      },
      de: {
        description: 'Das größte Steinbauwerk in Subsahara-Afrika, Groß-Simbabwe war die Hauptstadt des Königreichs Simbabwe. Seine massiven Granitwände, einige 11 Meter hoch und 5 Meter dick, wurden ohne Mörtel in Trockenmauerwerktechnik errichtet. Die Stadt war ein bedeutendes Handelszentrum, das Afrikas Inneres mit Häfen am Indischen Ozean verband.',
        funFact: 'Als Europäer Groß-Simbabwe im 19. Jahrhundert erstmals erblickten, weigerten sich viele zu glauben, dass Afrikaner es hätten bauen können — sie erfanden falsche Theorien über Phönizier oder verlorene israelitische Stämme. Archäologische Belege beweisen eindeutig, dass es vom Volk der Shona erbaut wurde.',
      },
      es: {
        description: 'La estructura de piedra más grande del África subsahariana, el Gran Zimbabue fue la capital del Reino de Zimbabue. Sus masivas paredes de granito, algunas de 11 metros de altura y 5 metros de grosor, fueron construidas sin mortero usando la técnica de piedra seca. La ciudad era un importante centro comercial que conectaba el interior de África con los puertos del Océano Índico.',
        funFact: 'Cuando los europeos encontraron el Gran Zimbabue por primera vez en el siglo XIX, muchos se negaron a creer que los africanos pudieran haberlo construido, fabricando falsas teorías sobre fenicios o tribus israelitas perdidas. La evidencia arqueológica demuestra definitivamente que fue construido por el pueblo Shona.',
      },
    },
  },
];
