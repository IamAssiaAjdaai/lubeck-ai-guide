import {
  addedLandmarkTranslations,
  type LandmarkContent,
} from "@/data/landmarkTranslations";
import type { Locale } from "@/lib/i18n";

const legacyLandmarks = [
  {
    slug: "holstentor",
    image: "/landmarks/holstentor.jpg",

    content: {
      en: {
        name: "Holstentor",
        duration: "2 min",
        audio: "/audio/holstentor-en.mp3",
        description:
          "Lübeck's famous medieval city gate and one of the city's most recognizable symbols.",
        story:
          "The Holstentor was built between 1464 and 1478. It protected the city while also showing Lübeck's wealth and importance during the Hanseatic era.",
        facts: [
          { label: "Built", value: "1464–1478" },
          { label: "Architecture", value: "Brick Gothic" },
          { label: "Known for", value: "Symbol of Lübeck" },
        ],
      },

      de: {
        name: "Holstentor",
        duration: "2 Min.",
        audio: "/audio/holstentor-de.mp3",
        description:
          "Das berühmte mittelalterliche Stadttor Lübecks und eines der bekanntesten Wahrzeichen der Stadt.",
        story:
          "Das Holstentor wurde zwischen 1464 und 1478 erbaut. Es schützte die Stadt und zeigte gleichzeitig Lübecks Reichtum und Bedeutung während der Hansezeit.",
        facts: [
          { label: "Erbaut", value: "1464–1478" },
          { label: "Architektur", value: "Backsteingotik" },
          { label: "Bekannt als", value: "Wahrzeichen Lübecks" },
        ],
      },

      fr: {
        name: "Holstentor",
        duration: "2 min",
        audio: "/audio/holstentor-fr.mp3",
        description:
          "La célèbre porte médiévale de Lübeck et l'un des symboles les plus connus de la ville.",
        story:
          "Le Holstentor a été construit entre 1464 et 1478. Il protégeait la ville tout en montrant la richesse et l'importance de Lübeck à l'époque hanséatique.",
        facts: [
          { label: "Construction", value: "1464–1478" },
          { label: "Architecture", value: "Gothique en brique" },
          { label: "Connu pour", value: "Symbole de Lübeck" },
        ],
      },

      ar: {
        name: "بوابة هولشتن",
        duration: "دقيقتان",
        audio: "",
        description: "بوابة لوبيك التاريخية الشهيرة وأحد أبرز رموز المدينة.",
        story:
          "بُنيت بوابة هولشتن بين عامي 1464 و1478. وكانت تحمي المدينة وفي الوقت نفسه تعكس ثروة لوبيك ومكانتها خلال العصر الهانزي.",
        facts: [
          { label: "تاريخ البناء", value: "1464–1478" },
          { label: "العمارة", value: "القوطية بالطوب" },
          { label: "تشتهر بأنها", value: "رمز مدينة لوبيك" },
        ],
      },
    },
  },

  {
    slug: "marienkirche",
    image: "/landmarks/marienkirche.jpg",

    content: {
      en: {
        name: "Marienkirche",
        duration: "2 min",
        audio: "/audio/marienkirche-en.mp3",

        description:
          "One of Lübeck's most important churches and a landmark of northern German Brick Gothic architecture.",

        story:
          "St. Mary's Church has been closely connected with Lübeck's history for centuries. A market church already existed here around 1160. As Lübeck grew into one of the leading cities of the Hanseatic League, St. Mary's became an important church for the city's merchants and council. During an air raid on the night of 28 to 29 March 1942, the church was severely damaged. Parts of the vaults and roofs collapsed and the historic organs were destroyed. After the Second World War, the church was gradually rebuilt.",

        facts: [
          {
            label: "Early history",
            value: "A market church existed around 1160",
          },
          {
            label: "Architecture",
            value: "Brick Gothic",
          },
          {
            label: "1942",
            value: "Severely damaged during an air raid",
          },
        ],
      },

      de: {
        name: "Marienkirche",
        duration: "2 Min.",
        audio: "",

        description:
          "Eine der bedeutendsten Kirchen Lübecks und ein Wahrzeichen der norddeutschen Backsteingotik.",

        story:
          "Die Marienkirche ist seit Jahrhunderten eng mit der Geschichte Lübecks verbunden. Bereits um 1160 befand sich hier eine Marktkirche. Als Lübeck zu einer der führenden Städte der Hanse wurde, entwickelte sich St. Marien zu einer wichtigen Kirche für Kaufleute und den Rat der Stadt. In der Nacht vom 28. auf den 29. März 1942 wurde die Kirche bei einem Luftangriff schwer beschädigt. Teile der Gewölbe und Dächer stürzten ein und die historischen Orgeln wurden zerstört. Nach dem Zweiten Weltkrieg wurde die Kirche schrittweise wieder aufgebaut.",

        facts: [
          {
            label: "Frühe Geschichte",
            value: "Um 1160 bestand hier bereits eine Marktkirche",
          },
          {
            label: "Architektur",
            value: "Backsteingotik",
          },
          {
            label: "1942",
            value: "Bei einem Luftangriff schwer beschädigt",
          },
        ],
      },

      fr: {
        name: "Église Sainte-Marie",
        duration: "2 min",
        audio: "",

        description:
          "L'une des églises les plus importantes de Lübeck et un monument majeur du gothique en brique.",

        story:
          "L'église Sainte-Marie est étroitement liée à l'histoire de Lübeck depuis des siècles. Une église de marché existait déjà ici vers 1160. Lorsque Lübeck devint l'une des principales villes de la Ligue hanséatique, Sainte-Marie devint une église importante pour les marchands et le conseil de la ville. Dans la nuit du 28 au 29 mars 1942, l'église fut gravement endommagée par un bombardement. Certaines voûtes et toitures s'effondrèrent et les orgues historiques furent détruites. Après la Seconde Guerre mondiale, l'église fut progressivement reconstruite.",

        facts: [
          {
            label: "Première histoire",
            value: "Une église existait ici vers 1160",
          },
          {
            label: "Architecture",
            value: "Gothique en brique",
          },
          {
            label: "1942",
            value: "Gravement endommagée par un bombardement",
          },
        ],
      },

      ar: {
        name: "كنيسة مريم",
        duration: "دقيقتان",
        audio: "",

        description:
          "إحدى أهم كنائس لوبيك وأحد أبرز معالم العمارة القوطية المبنية بالطوب في شمال ألمانيا.",

        story:
          "ترتبط كنيسة مريم بتاريخ لوبيك منذ قرون. وكانت توجد في هذا الموقع كنيسة للسوق منذ حوالي عام 1160. ومع تحوّل لوبيك إلى إحدى أهم مدن الرابطة الهانزية، أصبحت الكنيسة ذات أهمية كبيرة لتجار المدينة ومجلسها. وفي ليلة 28 إلى 29 مارس 1942 تعرضت الكنيسة لأضرار جسيمة خلال غارة جوية، حيث انهارت أجزاء من الأسقف والقباب ودُمرت آلات الأرغن التاريخية. وبعد الحرب العالمية الثانية أُعيد بناء الكنيسة تدريجياً.",

        facts: [
          {
            label: "البدايات",
            value: "كانت توجد كنيسة في هذا الموقع حوالي عام 1160",
          },
          {
            label: "العمارة",
            value: "القوطية المبنية بالطوب",
          },
          {
            label: "عام 1942",
            value: "تعرضت لأضرار جسيمة خلال غارة جوية",
          },
        ],
      },
    },
  },

  {
    slug: "rathaus",
    image: "/landmarks/rathaus.jpg",

    content: {
      en: {
        name: "Lübeck Rathaus",
        duration: "2 min",
        audio: "/audio/rathaus-en.mp3",

        description:
          "Lübeck's historic town hall, one of the most striking buildings in the heart of the old town.",

        story:
          "Construction of Lübeck Town Hall began around 1230 and was completed in 1308. Over the following centuries, the building was repeatedly expanded and altered, which explains its mixture of Brick Gothic and Renaissance architecture. The town hall was closely connected to Lübeck's political importance during the Hanseatic era and remains the seat of the city administration and local parliament today.",

        facts: [
          {
            label: "Construction began",
            value: "1230",
          },
          {
            label: "Completed",
            value: "1308",
          },
          {
            label: "Architecture",
            value: "Brick Gothic and Renaissance",
          },
        ],
      },

      de: {
        name: "Lübecker Rathaus",
        duration: "2 Min.",
        audio: "",

        description:
          "Das historische Rathaus Lübecks und eines der markantesten Gebäude im Herzen der Altstadt.",

        story:
          "Der Bau des Lübecker Rathauses begann um 1230 und wurde 1308 abgeschlossen. In den folgenden Jahrhunderten wurde das Gebäude mehrfach erweitert und verändert. Dadurch entstand eine Mischung aus Backsteingotik und Renaissance. Das Rathaus war eng mit der politischen Bedeutung Lübecks während der Hansezeit verbunden und dient bis heute als Sitz der Stadtverwaltung und der Bürgerschaft.",

        facts: [
          {
            label: "Baubeginn",
            value: "1230",
          },
          {
            label: "Fertigstellung",
            value: "1308",
          },
          {
            label: "Architektur",
            value: "Backsteingotik und Renaissance",
          },
        ],
      },

      fr: {
        name: "Hôtel de ville de Lübeck",
        duration: "2 min",
        audio: "",

        description:
          "L'hôtel de ville historique de Lübeck, au cœur de la vieille ville.",

        story:
          "La construction de l'hôtel de ville de Lübeck a commencé vers 1230 et s'est achevée en 1308. Au cours des siècles suivants, le bâtiment a été agrandi et transformé à plusieurs reprises, ce qui explique son mélange de styles gothique en brique et Renaissance. Il reste aujourd'hui le siège de l'administration municipale et du parlement local.",

        facts: [
          {
            label: "Début de la construction",
            value: "1230",
          },
          {
            label: "Achèvement",
            value: "1308",
          },
          {
            label: "Architecture",
            value: "Gothique en brique et Renaissance",
          },
        ],
      },

      ar: {
        name: "مبنى بلدية لوبيك",
        duration: "دقيقتان",
        audio: "",

        description: "مبنى البلدية التاريخي في قلب المدينة القديمة في لوبيك.",

        story:
          "بدأ بناء مبنى بلدية لوبيك حوالي عام 1230 واكتمل عام 1308. وخلال القرون التالية تم توسيعه وتعديله عدة مرات، ولهذا يجمع بين العمارة القوطية المبنية بالطوب وعناصر من عصر النهضة. ولا يزال المبنى حتى اليوم مقراً لإدارة المدينة واجتماعات البرلمان المحلي.",

        facts: [
          {
            label: "بداية البناء",
            value: "1230",
          },
          {
            label: "اكتمال البناء",
            value: "1308",
          },
          {
            label: "العمارة",
            value: "القوطية بالطوب وعصر النهضة",
          },
        ],
      },
    },
  },

  {
    slug: "heiligen-geist-hospital",
    image: "/landmarks/heiligen-geist-hospital.jpg",

    content: {
      en: {
        name: "Heiligen-Geist-Hospital",
        duration: "2 min",
        audio: "/audio/heiligen-geist-hospital-en.mp3",

        description:
          "One of Europe's oldest medieval social institutions and an important landmark of Lübeck.",

        story:
          "The Heiligen-Geist-Hospital was established at the Koberg between about 1260 and 1286. Supported by Lübeck's city council and wealthy merchants, it was created to care for sick, poor and elderly people. The hospital could accommodate more than one hundred residents. The small wooden chambers visible inside today were added in the early 19th century to provide more privacy. Remarkably, the building continued to serve elderly residents until 1970.",

        facts: [
          {
            label: "Established",
            value: "Around 1260–1286",
          },
          {
            label: "Purpose",
            value: "Care for sick, poor and elderly people",
          },
          {
            label: "Last residents",
            value: "Left in 1970",
          },
        ],
      },

      de: {
        name: "Heiligen-Geist-Hospital",
        duration: "2 Min.",
        audio: "",

        description:
          "Eine der ältesten mittelalterlichen Sozialeinrichtungen Europas und ein bedeutendes Wahrzeichen Lübecks.",

        story:
          "Das Heiligen-Geist-Hospital entstand am Koberg ungefähr zwischen 1260 und 1286. Mit Unterstützung des Lübecker Rates und wohlhabender Kaufleute wurde es geschaffen, um kranke, arme und ältere Menschen zu versorgen. Mehr als hundert Menschen konnten hier aufgenommen werden. Die kleinen Holzkammern im Inneren wurden erst zu Beginn des 19. Jahrhunderts eingebaut. Bis 1970 lebten hier noch ältere Bewohner.",

        facts: [
          {
            label: "Entstehung",
            value: "Etwa 1260–1286",
          },
          {
            label: "Zweck",
            value: "Versorgung kranker, armer und älterer Menschen",
          },
          {
            label: "Letzte Bewohner",
            value: "1970",
          },
        ],
      },

      fr: {
        name: "Hôpital du Saint-Esprit",
        duration: "2 min",
        audio: "",

        description:
          "L'une des plus anciennes institutions sociales médiévales d'Europe et un monument important de Lübeck.",

        story:
          "L'Hôpital du Saint-Esprit fut établi au Koberg entre environ 1260 et 1286. Avec le soutien du conseil de Lübeck et de riches marchands, il fut créé pour accueillir les personnes malades, pauvres et âgées. Plus de cent personnes pouvaient y être hébergées. Les petites chambres en bois visibles aujourd'hui furent ajoutées au début du XIXe siècle. Des résidents âgés y vécurent encore jusqu'en 1970.",

        facts: [
          {
            label: "Fondation",
            value: "Vers 1260–1286",
          },
          {
            label: "Fonction",
            value: "Soins aux personnes malades, pauvres et âgées",
          },
          {
            label: "Derniers résidents",
            value: "1970",
          },
        ],
      },

      ar: {
        name: "مستشفى الروح القدس",
        duration: "دقيقتان",
        audio: "",

        description:
          "إحدى أقدم المؤسسات الاجتماعية في أوروبا ومن أبرز معالم لوبيك التاريخية.",

        story:
          "أُنشئ مستشفى الروح القدس في منطقة كوبيرغ تقريباً بين عامي 1260 و1286، بدعم من مجلس مدينة لوبيك والتجار الأثرياء. وكان الهدف منه رعاية المرضى والفقراء وكبار السن. وكان بإمكانه استقبال أكثر من مئة شخص. أما الغرف الخشبية الصغيرة الموجودة داخله اليوم فأضيفت في بداية القرن التاسع عشر لتوفير مزيد من الخصوصية. واستمر بعض كبار السن في الإقامة فيه حتى عام 1970.",

        facts: [
          {
            label: "تاريخ التأسيس",
            value: "حوالي 1260–1286",
          },
          {
            label: "الهدف",
            value: "رعاية المرضى والفقراء وكبار السن",
          },
          {
            label: "آخر المقيمين",
            value: "عام 1970",
          },
        ],
      },
    },
  },

  {
    slug: "buddenbrookhaus",
    image: "/landmarks/buddenbrookhaus.jpg",

    content: {
      en: {
        name: "Buddenbrookhaus",
        duration: "2 min",
        audio: "/audio/buddenbrookhaus-en.mp3",

        description:
          "A famous literary landmark connected with Thomas Mann, Heinrich Mann and Lübeck's merchant history.",

        story:
          "The Buddenbrookhaus at Mengstraße 4 was built in 1758 for the merchant Johann Michael Croll. In 1842 it was purchased by Johann Siegmund Mann, the grandfather of writers Thomas and Heinrich Mann, and remained in the Mann family until 1891. The house later became world-famous through Thomas Mann's novel Buddenbrooks, published in 1901. The fictional family home in the novel was inspired by this real building, although many details were transformed for the story. Today the house is an important literary museum and research center dedicated to the Mann family.",

        facts: [
          {
            label: "Built",
            value: "1758",
          },
          {
            label: "Mann family",
            value: "Owned the house from 1842 to 1891",
          },
          {
            label: "Literary connection",
            value: "Inspired Thomas Mann's Buddenbrooks",
          },
        ],
      },

      de: {
        name: "Buddenbrookhaus",
        duration: "2 Min.",
        audio: "",

        description:
          "Ein berühmter Literaturort mit enger Verbindung zu Thomas Mann, Heinrich Mann und der Lübecker Kaufmannsgeschichte.",

        story:
          "Das Buddenbrookhaus in der Mengstraße 4 wurde 1758 für den Kaufmann Johann Michael Croll erbaut. 1842 kaufte Johann Siegmund Mann, der Großvater von Thomas und Heinrich Mann, das Haus. Bis 1891 blieb es im Besitz der Familie Mann. Weltberühmt wurde das Gebäude später durch Thomas Manns Roman Buddenbrooks aus dem Jahr 1901. Das Haus der Familie im Roman wurde von diesem realen Gebäude inspiriert, auch wenn Thomas Mann viele Details literarisch veränderte.",

        facts: [
          {
            label: "Erbaut",
            value: "1758",
          },
          {
            label: "Familie Mann",
            value: "Von 1842 bis 1891 im Familienbesitz",
          },
          {
            label: "Literatur",
            value: "Vorbild für Thomas Manns Buddenbrooks",
          },
        ],
      },

      fr: {
        name: "Buddenbrookhaus",
        duration: "2 min",
        audio: "",

        description:
          "Un célèbre lieu littéraire lié à Thomas Mann, Heinrich Mann et à l'histoire marchande de Lübeck.",

        story:
          "Le Buddenbrookhaus, situé au 4 Mengstraße, fut construit en 1758 pour le marchand Johann Michael Croll. En 1842, la maison fut achetée par Johann Siegmund Mann, le grand-père des écrivains Thomas et Heinrich Mann. Elle resta dans la famille Mann jusqu'en 1891. Le bâtiment devint ensuite célèbre dans le monde entier grâce au roman Buddenbrooks de Thomas Mann, publié en 1901. La maison familiale décrite dans le roman fut inspirée de ce bâtiment réel.",

        facts: [
          {
            label: "Construction",
            value: "1758",
          },
          {
            label: "Famille Mann",
            value: "Propriétaire de 1842 à 1891",
          },
          {
            label: "Littérature",
            value: "A inspiré le roman Buddenbrooks",
          },
        ],
      },

      ar: {
        name: "بودنبروك هاوس",
        duration: "دقيقتان",
        audio: "",

        description:
          "معلم أدبي شهير مرتبط بتوماس مان وهاينريش مان وتاريخ لوبيك التجاري.",

        story:
          "بُني بودنبروك هاوس في شارع مينغ شتراسه رقم 4 عام 1758 للتاجر يوهان ميشائيل كرول. وفي عام 1842 اشترى المنزل يوهان زيغموند مان، جد الكاتبين توماس وهاينريش مان، وبقي في ملكية عائلة مان حتى عام 1891. وأصبح المنزل مشهوراً عالمياً بعد نشر رواية بودنبروكس لتوماس مان عام 1901، حيث استلهم الكاتب منزل العائلة في الرواية من هذا المبنى الحقيقي، مع تغيير بعض التفاصيل لأغراض أدبية.",

        facts: [
          {
            label: "تاريخ البناء",
            value: "1758",
          },
          {
            label: "عائلة مان",
            value: "امتلكت المنزل من 1842 إلى 1891",
          },
          {
            label: "الارتباط الأدبي",
            value: "ألهم رواية بودنبروكس لتوماس مان",
          },
        ],
      },
    },
  },
] as const;

type AddedLocale = keyof typeof addedLandmarkTranslations;

export const landmarks = legacyLandmarks.map((item, index) => {
  const addedContent = Object.fromEntries(
    (Object.keys(addedLandmarkTranslations) as AddedLocale[]).map((locale) => [
      locale,
      addedLandmarkTranslations[locale][index],
    ]),
  ) as Record<AddedLocale, LandmarkContent>;

  return {
    slug: item.slug,
    image: item.image,
    content: {
      ...item.content,
      ...addedContent,
    } as Record<Locale, LandmarkContent>,
  };
});
