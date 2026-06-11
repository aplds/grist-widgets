Je vous présente un Custom Widget (vibe codé avec l’Assistant de la DINUM, code à auditer pour mise en prod. sur docs sensibles).

Techniquement, le widget est une “fusion” (frankenwidget ?) de ces deux widgets :

https://github.com/gristlabs/grist-widget/blob/master/markdown/ (widget Markdown grist)https://github.com/maluhialoha/grist-cw-html-to-pdf (widget impression de documents HTML en PDF)Que fait le widget ?

Concrètement, comme le widget Markdown, il permet de visualiser le contenu d’une colonne Markdown ou HTML (ou les deux), mais pas de l’éditer.

À la place du bouton “Éditer”, il propose un bouton “Imprimer”, qui n’imprime que la vue active. 

L’idée est de pouvoir faciliter l’impression de fiches générées par ailleurs, via une formule par exemple, en améliorant l’expérience utilisateur (sans avoir à aller sur les trois petits points, et faire “imprimer la vue”). 

La réutilisation du widget Markdown pour le rendu permet, a priori, d’assurer une présentation identique entre les deux outils. 

Le widget peut être essayé en collant ce lien comme custom widget : https://aplds.github.io/grist-widgets/view-print
