# p2p burako

<img width="2239" height="1586" alt="Screenshot_20261030_073747" src="https://github.com/user-attachments/assets/a85db78b-ea37-4b62-b1b6-3b9d89384cee" />

Burako de fichas para dos, navegador a navegador (WebRTC vía Trystero/Nostr, sin servidor).

Live: https://franciscocarloserra.github.io/burako/ — al abrirlo se genera un link con `#sala:clave`; pasalo entero al otro jugador.

La partida se guarda en cada dispositivo (localStorage) y se re-sincroniza al reconectar, así que se puede recargar o redesplegar sin perder la mano. Para publicar una versión nueva, subí la versión en `index.html` (`VERSION` y los `?v=` de los imports), `bot.js` y `version.txt`; ver `AGENTS.md`; los clientes abiertos muestran "actualizar".

Limitación: ambos navegadores tienen la partida completa; la mano del rival solo se oculta en pantalla.
