---
meta:
title: Le rôle de Business Operations Engineer
author: benjamin-boileux
description: Sales Ops Manager, Revenue Ops Manager, Business Ops Manager, Growth Hacker, Sales Enablement, Performance Manager… des postes difficiles à appréhender même quand on gravite dans le milieu. Cette série d’articles a été pensée pour vous aider à y voir plus clair et mieux comprendre leurs rôles et missions. Aujourd’hui, on vous explique le rôle du Business Ops Engineer.
read: 5 min
image: https://images.unsplash.com/photo-1581092335397-9583eb92d232?&w=1200&h=800&fit=crop
date: 2023-03-20
tags:
  - organisation
  - ops
---

Voir Chapitre 1 : [le rôle de Business Ops Manager](https://www.ocobo.co/media/3)

## 🃏 Rappel, introduction de la série : les différents rôles

Sales Ops Manager, Revenue Ops Manager, Business Ops Manager, Growth Hacker, Sales Enablement,
Performance Manager… des postes difficiles à appréhender même quand on gravite dans le milieu. Cette
série d’articles a été pensée pour vous aider à y voir plus clair et mieux comprendre leurs rôles et
missions.

Les métiers présentés ici ne sont pas exhaustifs et sont issus d’organisations que nous avons pu
mettre en place par le passé avec succès.

Et pour continuer cette série, voici le meilleur ami du business ops manager, la ressource
indispensable au développement d’un CRM de qualité : **le Business Ops Engineer.**

## 👨‍💻 Le Business Operations Engineer

### 🔖 **En deux mots : L’architecte système**

On l’a vu dans notre [premier article de la série](https://www.ocobo.co/media/3), le Business Ops
Manager est un profil généraliste, souvent vu comme un mouton à 5 pattes qui peut difficilement
maîtriser l’ensemble des aspects de son travail, notamment la partie tech qui demande des
**compétences spécifiques longues et fastidieuses à acquérir**.

Sur les premières phases de vie d’une entreprise, les équipes Revenue (i.e. celles en charge de la
génération de chiffre d’affaires : marketing, ventes, service client) ne sont pas forcément très
nombreuses. On peut donc se satisfaire d’une maitrise fonctionnelle des outils, de processus un peu
manuels ou techniquement peu complexes car ils sont moins souvent sollicités et vont être amenés à
évoluer rapidement. Toutefois, au fur et à mesure que l’entreprise évolue et que les équipes Revenue
se staffent, les process et les outils se doivent d’être de plus en plus performants, robustes,
scalables et personnalisés. Les attentes de la gestion du “run” et des bugs techniques sont plus
élevées avec des besoins forts en terme de réactivité (SLA), et une maintenance structurée et
optimisée. Cela va nécessiter un effort en Engineering bien plus important : **plus les process sont
centraux dans la vie de l’entreprise, plus le coût de chaque évolution ou de réparation d’un bug
dans le système croît, et de façon exponentielle**.

Il est donc très important de réfléchir le plus tôt possible à l’architecture technique de ses
outils : principalement le CRM, sa connexion au reste de l’écosystème, l’échange de données et la
scalabilité technique des solutions déployées pour les rendre efficaces, flexibles, robustes et
saines.

Si on reprend l’analogie avec le Product Management déjà exposée dans notre article sur le Business
Ops Manager, une start-up qui a construit un MVP (_Minimum Viable Product_) avec les moyens du bord,
qui a validé son concept et trouvé son _Product Market Fit_, va vite investir sur une deuxième
version de son produit plus saine en phase avec ses ambitions de scalabilité. C’est le même principe
ici : un CRM en place, à l’architecture réfléchie, parfaitement synchronisé avec le reste des outils
(back-office, facturation, etc) avec des automatisations optimisées, sera **vital pour fiabiliser la
récupération et l’utilisation d’une donnée centrale dans la maitrise de son activité, et donc un
gain de temps précieux pour le futur de l’entreprise**.

C’est pour cela que nous recommandons de réfléchir assez rapidement, lorsque le budget le permet, au
recrutement d’un profil Engineering dédié aux équipes Ops (rattaché directement aux Ops ou aux
équipes techniques) pour les aider sur plusieurs aspects :

- **Méthodologie de travail**
  - Bénéficier de la robustesse des processus de développement (Sandbox > Preprod > Prod) pour
    limiter les déploiements de bugs en production ;
  - Versionning du code ;
  - Déploiement continu ;
- **Robustesse et scalabilité**
  - Au même titre que le Product Manager n’est pas en charge de la solution technique à déployer, il
    est préférable de demander à un expert technique, la meilleure solution pour répondre à un
    problème (exemple pour un Salesforce Engineer : faut il mettre en place un _Process Builder_ ?
    Un _Flow_ ? Un _Batch Apex_ ?) ;
  - Rester un maximum proche du standard des solutions ;
  - Manipuler des gros volumes de données ;
- **Personnalisation des solutions**

  - Connecter le CRM aux meilleures API et au produit vendu (sign-up, synchronisation billing,
    données d’usage, etc.) ;
  - Créer des interfaces utilisateurs dédiées, composants ou _customs objects_ ;

{% callout %}
💡 **Spécificité Salesforce**
Dans l’écosystème Salesforce vous pouvez commencer à déléguer ce rôle à un Salesforce Admin dédié
qui aura entre autre cette responsabilité (en plus d’être un support de niveau 1) mais si vous avez
l’occasion de bien séparer les rôles vous verrez sur le moyen/long terme une vraie différence dans
la qualité de votre CRM.
{% /callout %}

ℹ️ **Itérations** : Business Solutions Architect / Technical Sales Ops / Salesforce Engineer /
Salesforce Developper / Salesforce Admin / Hubspot Admin / Full Stack Engineer / Back-end Engineer
_Peut inclure : Data Eng (pour la partie ETL)_

### 🏛️ Les principales missions

- Gérer l’évolution de la plateforme CRM (Salesforce, Hubspot, CRM interne, etc.) en portant les
  principales décisions techniques et directions d’architecture ;
- Gérer et maintenir les outils internes connectés au CRM ;
- Développer des workflows, processus, batchs, ainsi que la bonne connexion avec les outils tierces
  du CRM (via API, ETL, ou des outils dédiés) ;
- Développer les modules d’interfaces du back office et la documentation technique associée (ex :
  Lightning composant dans le monde Salesforce) ;
- Piloter les projets d’intégration et déploiement continu ;
- Assurer la maintenance applicative des outils internes et de la qualité de la donnée associée ;
- Dessiner et industrialiser les processus de développement ;
- Assurer le support de niveau supérieur des outils interne aux utilisateurs de l’entreprise.

### 🎫 La carte de visite du Business Ops Engineer

![BusinessOps Engineer.png](https://ipjmp3k0z0p479cb.public.blob.vercel-storage.com/content/posts/6/1.png)

🤹 **Skillset :** Engineering, Back End Tech, Front End Tech, API, Salesforce Architecture
(Certifications), ETL

## 💬 Bonus : l’interview d’une personne dont c’est le métier

On profite de cet article de présentation pour rendre plus concret la fonction. Et pour cela rien de
mieux que de laisser la parole à quelqu’un qui la vit depuis plusieurs années !

Aujourd’hui, la parole 🎙️ est donnée à
[**Clément Tixier**](https://www.linkedin.com/in/clement-tixier/) Business Ops Engineer chez Yousign
depuis Septembre 2021, ancien Salesforce Tech Lead en ESN qui gravite dans cet écosystème depuis
plus 8 ans.

—

**Ocobo :** Quel a été, en quelques lignes, ton parcours pour en arriver à ce rôle de Business Ops
Engineer aujourd’hui chez Yousign?

**Clément :**

> J'ai commencé par suivre un cursus d'ingénieur en informatique. C'est pendant mes études que j'ai
> découvert les joies du développement.
>
> Comme beaucoup de personnes dans mon cas, mes premiers pas dans la vie actives m'ont mené dans le
> monde des ESN.
>
> Alors que je me voyais plutôt entamer une carrière de développeur, j'ai accepté une mission courte
> de consultant fonctionnel. Ça a été un véritable tournant et j'ai adoré découvrir ce métier auquel
> je ne me destinais pas du tout.
>
> J'ai ainsi découvert Salesforce, les problématiques commerciales (qu'elles émanent du terrain ou
> du siège) et bien d'autres choses ! Suite à cette première expérience, j'ai repris la casquette de
> développeur que j'avais mise de côté, afin de mettre les mains dans la machine.
>
> J'ai donc eu deux expériences de consultant technico-fonctionnel par la suite, et c'est ce qui m'a
> finalement amené aujourd'hui au poste de Business Operations Engineer en startup/scale-up, qui
> rassemble l'ensemble des tâches que j'ai été amené à réaliser jusqu'à présent.

—

**Ocobo :** Peux-tu présenter tes missions au quotidien?

**Clément :**

> Au quotidien, je suis avant tout garant du fonctionnement de Salesforce chez Yousign. Je m'assure
> que l'ensemble des utilisateurs peuvent réaliser leurs tâches dans l'outil sans blocage, et dans
> les meilleures conditions possibles.
>
> Ensuite, je m'occupe du paramétrage de l'outil en travaillant de concert avec mes collègues
> Business Operations Manager : cadrage fonctionnel, conception technique, développement, recette,
> livraison et communication, on ne s'ennuie pas !
>
> En parallèle, pour s'assurer de l'efficacité de nos missions, nous avons appliqué, au sein de
> l'équipe, les recettes du monde du développement : méthodologies agiles (rituels, sprints, gestion
> du backlog, etc.), utilisation d'un outil de ticketing adapté (comme Jira), gestion du
> versionnement avec Git, etc. Sur le périmètre des équipes Revenue, les demandes n'ont pas toutes
> les mêmes échéances, et il est donc nécessaire de pouvoir facilement isoler les différents
> changements pour pouvoir livrer rapidement sans risque de régression. Investir du temps sur ces
> sujets vaut vraiment le coup, et cela m'a évité de nombreux casse-têtes par la suite.
>
> Par ailleurs, étant dans le monde du SaaS, avoir les deux rôles (technique et fonctionnel) permet
> d'intégrer les contraintes du produit avec les ambitions du revenu. Ma position est idéale pour
> faire parler les deux mondes, et c'est une occasion en or pour en apprendre tout autant.
>
> Enfin, j'ai l'occasion de pouvoir toucher à nombre d'outils à destination des équipes business :
> téléphonie, facturation, systèmes d'assignation automatique... il y a de quoi s'amuser !

—

**Ocobo :** Et finalement, après toutes ces expériences, ayant vu tes missions évoluer
régulièrement, comment vois-tu le rôle de Business Ops Engineer dans les prochaines années ?

**Clément :**

> Selon moi, les **Business Operations Engineers** vont de paire avec les **Business Operations
> Managers**, et ce n'est pas qu'une question d'intitulé de poste.
>
> Si l'énergie du Business Operations Manager est centrée sur la production de spécifications pour
> ses collègues techniques, il sera difficile de distinguer son activité du PM/PO.
>
> De fait, un couteau suisse métier fonctionnera au meilleur de ses capacités avec un couteau suisse
> technique.
>
> Donc je ne serai pas étonné de voir une augmentation de l'ouverture de tels postes une fois que
> les opérations auront fait leur place dans le monde du travail. Aujourd'hui, la consommation de
> SaaS ne fait qu'augmenter. Pour la plupart, ces nouveaux outils sont relativement accessibles, et
> il est vite possible de faire des paramétrages avancés sans la moindre connaissance de
> développement. Le no-code a la vent en poupe, et c'est une très bonne nouvelle ! Mais on oublie
> l'infrastructure, l'installation, le modèle de données, le choix des technologies... Les
> plateformes sont ouvertes et il est très vite possible de livrer une solution à un problème. Le
> meilleur exemple que j'ai sur le sujet est l'application Zapier : c'est tout de même fou de
> pouvoir faire parler en quelques clics deux applications entre elles ! Cependant, ce serait une
> erreur de croire que cette facilité peut se permettre de se débarrasser de ses
> développeurs/consultants techniques. Certes, il est facile d'arriver rapidement à ses fins quand
> il s'agit d'un petit sujet. Mais s'il faut penser mise à l'échelle, ce sera bien plus efficace
> d'avoir un **Business Operations Engineer**, un véritable expert, qui aura cette mission en tête
> tout au long de sa tâche.
>
> C'est ce que l'on peut voir avec Salesforce : la facilité pour créer des champs, des objets, des
> automatismes est déconcertante ! Mais les limites ne sont jamais très loin, et un processus qui
> fonctionnait avec 100 lignes de données n'est pas dit de fonctionner tel quel avec 10 000, 100 000
> ou 1 000 000 de lignes. Le **Business Operations Engineer** a donc de beau jours devant lui, et
> l'aventure ne fait que commencer !
