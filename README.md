# burako

Burako de fichas para dos, navegador a navegador (WebRTC vía Trystero/Nostr, sin servidor).

Live: https://franciscocarloserra.github.io/burako/ — al abrirlo se genera un link con `#sala:clave`; pasalo entero al otro jugador.

La partida se guarda en cada dispositivo (localStorage) y se re-sincroniza al reconectar, así que se puede recargar o redesplegar sin perder la mano. Para publicar una versión nueva, subí la versión en `index.html` (`VERSION` y los `?v=` de los imports), `bot.js` y `version.txt`; ver `AGENTS.md`; los clientes abiertos muestran "actualizar".

Limitación: ambos navegadores tienen la partida completa; la mano del rival solo se oculta en pantalla.
