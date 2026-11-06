# Bakma Store — Back-office administrateur

Panneau d'administration de la marketplace Bakma Store (Next.js 16, React 19, Tailwind v4, Supabase).
Il permet à l'équipe de valider les demandes de publication, attribuer les consultations vétérinaires,
modérer les annonces, les utilisateurs et les signalements, valider les vétérinaires, suivre les
statistiques et configurer la plateforme.

## Démarrer

```bash
cp .env.example .env.local   # renseigner les clés Supabase et les URLs des 3 applications
npm install
npm run dev                  # http://localhost:3001
```

`npm run build` / `npm start` pour la production (port 3001).

## Créer le premier administrateur

Un compte admin ne peut pas être créé par l'inscription. Après avoir exécuté `supabase/schema.sql` :

1. Créez un compte (via le site public ou Supabase > Authentication > Add user).
2. Dans Supabase > SQL Editor :

```sql
update public.profiles set role = 'admin'
 where id = (select id from auth.users where email = 'votre@email.com');
```

3. Connectez-vous sur http://localhost:3001/connexion. Les administrateurs suivants peuvent ensuite
   être promus depuis la page **Utilisateurs** (action « Changer le rôle »).

Pour la réinitialisation du mot de passe, ajoutez `${NEXT_PUBLIC_ADMIN_URL}/reinitialiser-mot-de-passe`
aux « Redirect URLs » de Supabase (Authentication > URL Configuration).
