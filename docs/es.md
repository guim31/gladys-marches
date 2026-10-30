# Marchés

Los **mercados de alimentación** (al aire libre, cubiertos, ecológicos, de productores) **de París,
Toulouse y Estrasburgo** en Gladys: ¿hay mercado hoy, está abierto ahora, hasta qué hora, y cuándo es
el próximo día de mercado? Días y horarios proceden de los **datos abiertos** de las ciudades. **Sin
cuenta ni clave.**

> Las ciudades solo publican el ritmo semanal: festivos, cancelaciones y días excepcionales no se
> publican. Compruébelo antes de ir, sobre todo un día festivo.

Integración no oficial, sin relación con las ciudades ni con los gestores de los mercados. Probada con
las respuestas reales de las tres fuentes (30/10/2026), aún no en una instancia real de Gladys: sus
comentarios son bienvenidos.

## Lo que obtiene

- Un **dispositivo por mercado** añadido: mercado hoy, abierto ahora, hora de fin de hoy, próximo
  mercado, días de mercado.
- Un **widget** «Mercados de hoy»: los mercados de hoy alrededor de la casa (10 como máximo, los más
  cercanos primero), en verde cuando están abiertos, en naranja la última media hora, en azul antes de
  empezar, en gris una vez terminados.
- Tres **disparadores de escena**: un mercado abre, un mercado termina pronto (30 minutos por
  defecto), y «Mercado mañana», la víspera de un día de mercado (19:00 por defecto).
- Una **acción de escena** «Mercados hoy cerca de mí»: los mercados de hoy cerca de la casa en una
  frase, con su horario, si están abiertos y a qué distancia.

## Requisitos

- Gladys Assistant **5.3.0** o posterior.
- Acceso a Internet desde Gladys: las fuentes son portales públicos de datos abiertos.
- Para los mercados más cercanos, el widget y la frase de escena: la ubicación de la casa en Gladys
  (**Ajustes → Casas**).

## Instalación

1. En Gladys, abra **Integraciones → Instalar desde GitHub**.
2. Pegue `https://github.com/guim31/gladys-marches` y confirme.
3. Gladys pide compartir la ubicación de la casa: solo sirve para encontrar los mercados más cercanos
   y nunca sale de su Gladys.

## Configuración

### Ajustes

- **Ciudades**: se proponen todos los mercados de alimentación de las ciudades marcadas (París 72,
  Toulouse 45, Estrasburgo 19).
- **Mercados más cercanos**: proponer también este número de mercados más cercanos a la casa (3 por
  defecto, 0 para desactivar), dentro de la **distancia máxima** (5 km en línea recta por defecto).
  La misma distancia limita el widget y la frase de escena.
- **Fin próximo (minutos)**: cuándo se dispara «Un mercado termina pronto» (30 por defecto).
- **Hora de «Mercado mañana»**: la hora, la víspera de un día de mercado, del disparador «Mercado
  mañana» (19 por defecto).
- **Idioma de los nombres y mensajes**: francés por defecto. Los nombres de las funciones se fijan
  al añadir un dispositivo; los textos siguen el idioma de inmediato.

### Añadir mercados

Guarde la configuración: los mercados aparecen en la pestaña **Descubrir** de la integración. Añada
aquellos a los que va. Un mercado añadido sigue vigilado aunque desmarque su ciudad.

### Comprobar

El botón **Estado** enumera las ciudades leídas, el número de mercados de alimentación, los mercados
propuestos, la última lectura y los errores.

## Dispositivos

| Función         | Tipo    | Valor                                                            |
| --------------- | ------- | ---------------------------------------------------------------- |
| Mercado hoy     | binario | 1 cuando el mercado se celebra hoy                               |
| Abierto ahora   | binario | 1 abierto, 0 no; sin valor si el horario es ilegible             |
| Fin hoy         | texto   | «13:30», «Hoy no hay mercado», «13:30 (festivo: compruébelo)»    |
| Próximo mercado | texto   | «hoy a las 16:00», «mañana a las 07:00», «el sábado a las 07:30» |
| Días de mercado | texto   | «mié. 07:00–13:30 · sáb. 07:00–14:30»                            |

La integración calcula los valores cada minuto, sin ninguna petición.

## Widget del panel

Añada el widget **Mercados de hoy** a un panel: una fila por mercado de hoy alrededor de la casa (10
como máximo, los más cercanos primero), con «abierto hasta las 13:30 · 0,4 km», «termina en 20 min»,
«desde las 16:00» o «terminado a las 13:30». Sin casa ubicada, muestra los mercados añadidos a
Gladys. El ajuste **Mostrar la distancia** oculta la distancia.

## Disparadores de escena

- **Un mercado abre**: variables `market_name`, `ends_at`.
- **Un mercado termina pronto**: tantos minutos antes del fin como se ajuste en la configuración;
  variables `market_name`, `ends_at`, `minutes_left`.
- **Mercado mañana**: la víspera de un día de mercado, a la hora ajustada; variables `market_name`,
  `starts_at`, `ends_at`.

Cada disparador puede limitarse a algunos mercados; vacío, lo dispara cualquier mercado añadido. Tras
una pausa larga (ordenador en reposo, Gladys detenido), no se envía ningún disparador con retraso.

## Acción de escena

**Mercados hoy cerca de mí** devuelve `sentence` («Mercados hoy cerca de usted: Marché Victor Hugo
(07:00–13:30, abierto, 0,3 km), …»), `markets_count` y `open_count`. Sin casa ubicada, la frase
enumera los mercados añadidos a Gladys que se celebran hoy. Envíela en un mensaje o a un altavoz, o
continúe solo si `markets_count` es mayor que 0.

## Ejemplos de escenas

- El sábado a las 8:00, enviar «Mercados hoy cerca de mí» a su teléfono.
- «Mercado mañana» el viernes por la tarde: un recordatorio para llevar las bolsas.
- «Un mercado termina pronto» cuando está fuera: última ocasión para el pan fresco.

## Datos y actualización

| Ciudad      | Fuente                                                          | Mercados de alimentación | Licencia        |
| ----------- | --------------------------------------------------------------- | ------------------------ | --------------- |
| París       | opendata.paris.fr, `marches-decouverts`                         | 72                       | ODbL            |
| Toulouse    | data.toulouse-metropole.fr, `marches-couverts-et-de-plein-vent` | 45                       | Licence Ouverte |
| Estrasburgo | data.strasbourg.eu, `sites-marches-d-approvisionnement`         | 19                       | Licence Ouverte |

- Cada ciudad es una petición **una vez al día** (una hora después tras un fallo), solo para las
  ciudades necesarias; las tres cuando la casa está ubicada. Todo lo demás se calcula cada minuto a
  partir de los días guardados, en la zona horaria de París.
- Solo se guardan los mercados de alimentación: los de flores, libros, pulgas, sellos y artesanía se
  descartan.
- Los festivos se calculan sin conexión (Alsacia-Mosela incluida) y solo se señalan: muchos mercados
  mantienen su día, las fuentes no dicen cuáles.

## Solución de problemas

- **Nada en la pestaña Descubrir**: marque una ciudad, o ubique la casa y deje «Mercados más
  cercanos» por encima de 0. El botón **Estado** indica cuál.
- **El widget dice que no hay mercado**: ningún mercado dentro de la distancia máxima se celebra hoy;
  aumente la distancia si es necesario.
- **«Horario ilegible»**: la fuente publicó un horario que la integración no lee (nunca adivina):
  díganoslo en el foro.
- **Una ciudad no está disponible**: se guardan los últimos días leídos; nuevo intento una hora
  después.
- Registros: en la pantalla de la integración, o `LOG_LEVEL=debug` para cada lectura.

## Limitaciones

- Solo tres ciudades: Lyon, Burdeos, Nantes, Rennes y las demás no publican hoy los días y horarios
  de sus mercados como datos abiertos. Indíquenos otra fuente.
- El conjunto de Toulouse cubre la ciudad de Toulouse, no toda la metrópoli; sus mercados no tienen
  identificador, el nombre sirve como tal.
- París cubre sus mercados al aire libre; sus mercados cubiertos no están en el conjunto de datos.
- Desarrollada sin visitar los mercados: sus comentarios son bienvenidos.

## Créditos

Datos: Ville de Paris (ODbL), Mairie de Toulouse y Ville et Eurométropole de Strasbourg (Licence
Ouverte). Construida sobre el [SDK de integración de Gladys](https://github.com/GladysAssistant/integration-sdk-js).
