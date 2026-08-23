# EduTaskManager

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.12.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

-------------------------------------
--ESTRUCTURA DEL PROYECTO----------
ng g interface core/models/user --type=model

ng g s core/services/auth --skip-tests
ng g s core/services/firestore --skip-tests
 ng g s core/services/notificacion --skip-tests
 
ng g guard core/guards/auth --skip-tests

ng g c features/auth/login --skip-tests   
ng g c features/auth/register --skip-tests
ng g c features/calendar/calendar-view --skip-tests
ng g c features/tasks/my-tasks --skip-tests
ng g c features/dashboard --skip-tests 

ng g c features/auth/forgot-password --skip-tests
ng g c features/auth/verify-email --skip-tests
-------istalacion de fire base
npm install firebase
 @angular/fire@19.2.0 bootstrap


ng g c features/admin/gestion-usuarios --skip-tests
ng add @angular/material                    //Es una librería oficial de componentes UI para Angular, basada en las guías de diseño de Google Material Design.
                                            Sirve para que tu aplicación tenga componentes listos, modernos y responsivos (botones, menús, formularios, tablas, diálogos, tarjetas, etc.) sin que tengas que diseñarlos desde cero.


ng g interface core/models/actividadPredeterminada --type=model
ng g interface core/models/visita --type=model

ng g s features/rte/visita --skip-tests
ng g s features/rte/actividad --skip-tests

 ng g c features/rte/calendario --skip-tests   

 ng generate component features/rte/gestion-actividades --skip-tests=true
ng generate component features/rte/day-panel --skip-tests=true
ng generate component features/rte/visita-form --skip-tests=true
ng generate component features/rte/visita-tracker-modal --skip-tests=true
ng generate component features/rte/details-panel --skip-tests=true

--------Angular calnedar
npm install @angular/animations@~19.2.15 --save
npm install angular-calendar@0.31.0 --save
npm install date-fns --save
