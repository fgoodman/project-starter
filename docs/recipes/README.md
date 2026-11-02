# Recipes

Guides for features that aren't in the starter's code, so each one is set up the same way every time. They're drawn from Percolatus, Nomp and Rummy Dummy.

Paths like `percolatus/client/src/lib/version.ts` are relative to the folder holding those projects. Copy from the current version of the file, then remove anything specific to that app.

| Recipe | Use it when |
|---|---|
| [Visual tests](visual-tests.md) | Every project, starting with its first real page |
| [Deploy](deploy.md) | The project is ready to go live |
| [Firebase Auth](firebase-auth.md) | The app has user accounts |
| [API client](api-client.md) | The client calls the Worker |
| [Mock mode](mock-mode.md) | You want to work on the UI with fake data and no sign-in |
| [UI foundations](ui-foundations.md) | The app has real UI beyond a page or two |
| [PWA and deploys](pwa-and-deploys.md) | People keep the app open or install it |
| [Theme setting](theme-setting.md) | The app has a settings page |
| [D1](d1.md) | The data suits SQL |
| [Firestore](firestore.md) | The data suits documents (NoSQL) |
| [Durable Objects](durable-objects.md) | The app is real-time |
| [Stored data versioning](stored-data-versioning.md) | The app saves whole objects whose shape may change |
| [R2 images](r2-images.md) | Users upload images |
| [Push notifications](push-notifications.md) | The app sends notifications |
| [Prerendered pages](prerendered-pages.md) | Pages need to be readable by search engines without running the app |

## Writing a recipe

Each recipe says what it does, when to use it, the steps, and how to check it works. Keep real project IDs and keys out.
