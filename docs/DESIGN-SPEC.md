# Эталон из макета

Источник: Paper, файл «My folio», артборд **main** 1280×832.
Позиции даны от левого верхнего угла окна при ширине 1280.

## Геометрия

| Элемент | x | y | w | h | Примечание |
|---|---|---|---|---|---|
| Колонка About | 170 | 0 | 300 | 832 | padding-block 32, gap 32 |
| Аватар | 170 | 32 | 148 | 148 | radius 32, cover |
| Часы | 322 | 32 | 148 | 148 | круг, padding 16 / 40 |
| Who: имя | 170 | 212 | — | 20 | 500, `--textprimary` |
| Who: роль | 170 | 232 | — | 20 | «is a» `--textsecondary`, «product designer» 500 `--text-accent` |
| About: заголовок | 170 | 284 | — | 20 | 500, `--textprimary`, gap 8 |
| About: текст | 170 | 312 | 300 | 40 | `--textsecondary` |
| Заголовок Experience | 170 | 384 | — | 20 | 500, `--textprimary`, gap 4 |
| Список опыта | 170 | 408 | 300 | 192 | 4 строки |
| Строка опыта | — | — | 300 | 48 | лого 22 radius 8, gap 8, padding-block 12, текст body-s `--textsecondary` |
| Кнопка Contact | 170 | 712 | 300 | 40 | radius 12 |
| Open to work | 170 | 772 | ~100 | 28 | pill, padding 0 8 0 4 |
| Кнопка темы | 442 | 772 | 28 | 28 | radius 32, иконка 16 |
| Gallery | 550 | 0 | 560 | 832 | padding-block 32 |

Отступ между колонками 80, ширина контента 940, контент по центру.

## Типографика

| Стиль | Шрифт | Кегль / интерлиньяж | Трекинг | Цвет |
|---|---|---|---|---|
| Имя, заголовки | Inter Display 500 | 15 / 20 | −0.2px | `--textprimary` |
| Роль, текст About | Inter Display 400 | 15 / 20 | −0.2px | `--textsecondary`, «product designer» 500 `--text-accent` |
| Строки опыта | Inter Display 400 | 14 / 20 | −0.2px | компания и год `--textsecondary` |
| Contact | Inter Display 400 | 15 / 20 | −0.2px | `--textuniversalwhite` |
| Open to work | Inter Display 400 | 12 / 14 | −0.2px | `--textsecondary` |
| Цифры часов | Geist Mono 300 | 40 / 94% | 0 | `--textuniversalwhite` |
| Подписи часов | Matrix Sans Print | 11 / 100% | 0.1em | `--textuniversalwhite` |

«product designer» без подчёркивания, цвет `#695A42` (`--text-accent`).

## Цвета

| Токен | Светлая | Тёмная (черновик) |
|---|---|---|
| `--surfacebackground` | `#FDFCFA` | `#171614` |
| `--surfaceneutral` | `#F7F5EB` | `#22211D` |
| `--surfaceclock` | `#262521` | `#2E2D28` |
| `--textprimary` | `#262521` | `#F2F0E8` |
| `--textsecondary` | `#746F62` | `#8F8A7B` |
| `--textuniversalwhite` | `#FDFCF8` | `#FDFCF8` |
| `--border-divider` | `#E5E4DC` (0.8px) | `#2F2E29` |
| `--icon-muted` (луна) | `#B2AFA1` | `#6F6C61` |
| `--status-positive` | `#0DC997`, ореол 20% | без изменений |

## MeshGradient (кнопка Contact)

```ts
colors:     ['#C7C3A2', '#373D4D', '#7F7D93', '#CDA56E']
speed:      0.6
scale:      5
distortion: 0.4
swirl:      0.1
frame:      470745.4600002129
```
Под шейдером фон `#262521`: он виден, пока WebGL не инициализировался или недоступен.
