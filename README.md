# 🗳️ Sistema de Elección de Embajadores (FNE)

Plataforma web desarrollada para la gestión integral y el cómputo de votos en tiempo real en el marco de la Fiesta Nacional de los Estudiantes (FNE) en La Quiaca, Jujuy.

## Tecnologías Utilizadas
- **Frontend:** Angular (Standalone Components)
- **Estilos:** Tailwind CSS / CSS
- **Backend & BaaS:** Firebase (Authentication, Firestore Database, Hosting)
- **Control de Versiones:** Git / GitHub

## Funcionalidades Principales
- **Panel de Administración (Admin):** Gestión completa de elecciones, carga y alta de candidatos y jurados autorizados.
- **Módulo de Votación:** Interfaz segura para que los jurados emitan sus sufragios correspondientes.
- **Cómputo en Tiempo Real:** Motor de conteo automático de votos al finalizar la votación para procesar y proclamar a los ganadores de forma transparente y dinámica.

##  Cómo ejecutar el proyecto localmente
1. Clonar el repositorio:
   `git clone https://github.com/machacaenzo/sistema-elecciones-fne.git`
2. Instalar las dependencias:
   `npm install`
3. Configurar tus credenciales de Firebase en el archivo de entorno (`src/environments/environment.development.ts`).
4. Ejecutar el servidor de desarrollo:
   `ng serve`
5. Abrir el navegador en `http://localhost:4200/`.
