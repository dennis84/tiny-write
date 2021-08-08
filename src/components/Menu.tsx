import React, {useEffect, useState} from 'react'
import {EditorView} from 'prosemirror-view'
import {EditorState} from 'prosemirror-state'
import {undo, redo} from 'prosemirror-history'
import {deleteSelection, selectAll} from 'prosemirror-commands'
import {differenceInHours, format} from 'date-fns'
import styled from '@emotion/styled'
import {css} from '@emotion/react'
import {version} from '../../package.json'
import {Config, File, Collab} from '..'
import {
  Discard,
  New,
  Open,
  ToggleFullscreen,
  UpdateCollab,
  UpdateConfig,
  UpdatePath,
  UpdateText,
  useDispatch,
} from '../reducer'
import {color, color2, themes, fonts, codeThemes, rgba} from '../config'
import {isElectron, isMac, alt, mod, WEB_URL, VERSION_URL} from '../env'
import * as remote from '../remote'
import {createMarkdownParser, serialize} from '../markdown'
import {createSchema, createState} from '../prosemirror'
import {ProseMirrorState, isEmpty, isInitialized} from '../prosemirror/state'

const Container = styled.div`
  position: relative;
  flex-shrink: 0;
  flex-grow: 1;
  height: 100%;
  -webkit-app-region: no-drag;
  font-family: 'JetBrains Mono';
`

const Burger = styled.button<any>`
  position: absolute;
  left: -40px;
  z-index: 9999999;
  width: 20px;
  height: 20px;
  padding: 2px 0;
  margin: 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  background: none;
  border: 0;
  outline: none;
  -webkit-app-region: no-drag;
  > span {
    background: ${props => rgba(color(props.theme))};
    height: 2px;
    width: 100%;
    border-radius: 4px;
    transition: 0.4s;
  }
  ${props => props.active && `
    > span:nth-of-type(1) {
      transform: rotate(-45deg) translate(-5px, 5px);
    }
    > span:nth-of-type(2) {
      opacity: 0;
    }
    > span:nth-of-type(3) {
      transform: rotate(45deg) translate(-5px, -5px);
    }
  `}
`

const Off = styled.div`
  background: ${props => rgba(color(props.theme), 0.1)};
  padding: 20px;
  height: 100%;
  min-width: 460px;
  overflow-y: auto;
  scrollbar-width: none;
  ::-webkit-scrollbar {
    display: none;
  }
`

const Menu = styled.div``

const Label = styled.h3`
  margin: 0;
  font-size: 14px;
  text-transform: uppercase;
  color: ${props => rgba(color(props.theme), 0.5)};
  > i {
    text-transform: none;
  }
`

const Sub = styled.nav`
  margin: 10px 0;
  margin-bottom: 30px;
`

export const Common = css`
  height: 50px;
  padding: 0 20px;
`

export const Item = (props: {theme: Config}) => css`
  width: 100%;
  padding: 2px 0;
  margin: 0;
  outline: none;
  display: flex;
  align-items: center;
  color: ${rgba(color(props.theme))};
  font-size: 18px;
  line-height: 24px;
  font-family: 'JetBrains Mono';
  white-space: nowrap;
`

const Text = styled.p`
  ${Item}
`

const Link = styled.button`
  ${Item}
  background: none;
  border: 0;
  cursor: pointer;
  > span {
    justify-self: flex-end;
    margin-left: auto;
    > i {
      color: ${props => rgba(color(props.theme), 1)};
      background: ${props => rgba(color(props.theme), 0.1)};
      border: 1px solid ${props => rgba(color(props.theme), 0.6)};
      box-shadow: 0 2px 0 0 ${props => rgba(color(props.theme), 0.6)};
      border-radius: 2px;
      font-size: 13px;
      line-height: 1.4;
      padding: 1px 4px;
      margin: 0 1px;
    }
  }
  &:hover {
    color: ${props => rgba(color2(props.theme))};
    > span i {
      position: relative;
      box-shadow: 0 3px 0 0 ${props => rgba(color(props.theme), 0.6)};
      top: -1px;
    }
  }
  &:active {
    > span i {
      position: relative;
      box-shadow: none;
      top: 1px;
    }
  }
  &[disabled] {
    color: ${props => rgba(color(props.theme), 0.6)};
    cursor: not-allowed;
  }
`

const Slider = styled.input`
  -webkit-app-region: no-drag;
`

interface Props {
  text: ProseMirrorState;
  lastModified?: Date;
  path?: string;
  files: File[];
  config: Config;
  fullscreen: boolean;
  collab?: Collab;
  markdown: boolean;
  keymap: {[key: string]: any};
  editorViewRef: React.RefObject<EditorView>;
}

export default (props: Props) => {
  const dispatch = useDispatch()
  const [show, setShow] = useState(false)
  const [lastAction, setLastAction] = useState<string | undefined>()
  const editorView = props.editorViewRef.current

  const collabText =
    props.collab?.started ? 'Stop' :
    props.collab?.error ? 'Restart 🚨' :
    'Start'

  const collabUsers = props.collab?.y?.provider.awareness.meta.size ?? 0

  const onBurgerClick = () => {
    editorView.focus()
    setShow(!show)
  }

  const onUndo = () => {
    undo(editorView.state, editorView.dispatch)
  }

  const onRedo = () => {
    redo(editorView.state, editorView.dispatch)
  }

  const cmd = (cmd: string) => () => {
    document.execCommand(cmd)
    setLastAction(cmd)
  }

  const onCopyAllAsMd = () => {
    remote.copyAllAsMarkdown(editorView.state).then(() => {
      setLastAction('copy-md')
    })
  }

  const onChangeTheme = (theme) => () => {
    dispatch(UpdateConfig({...props.config, theme}))
  }

  const onChangeCodeTheme = (codeTheme) => () => {
    dispatch(UpdateConfig({...props.config, codeTheme}))
  }

  const onChangeFont = (font) => () => {
    dispatch(UpdateConfig({...props.config, font}))
  }

  const onChangeFontSize = (e) => {
    dispatch(UpdateConfig({...props.config, fontSize: parseInt(e.target.value)}))
  }

  const onChangeContentWidth = (e) => {
    dispatch(UpdateConfig({...props.config, contentWidth: parseInt(e.target.value)}))
  }

  const onToggleAlwaysOnTop = () => {
    dispatch(UpdateConfig({...props.config, alwaysOnTop: !props.config.alwaysOnTop}))
  }

  const onToggleMarkdown = () => {
    const markdown = !props.markdown
    const selection = {type: 'text', anchor: 1, head: 1}
    let doc

    if (markdown) {
      const lines = serialize(editorView.state).split('\n')
      const nodes = lines.map((text) => {
        return text ? {type: 'paragraph', content: [{type: 'text', text}]} : {type: 'paragraph'}
      })

      doc = {type: 'doc', content: nodes}
    } else {
      const schema = createSchema({
        config: props.config,
        markdown,
        path: props.path,
        keymap: props.keymap,
        y: props.collab?.y,
      })

      const parser = createMarkdownParser(schema)
      let textContent = ''
      editorView.state.doc.forEach((node) => {
        textContent += `${node.textContent.trim()}\n`
      })
      const text = parser.parse(textContent)
      doc = text.toJSON()
    }

    const text = createState({
      data: {selection, doc},
      config: props.config,
      markdown,
      path: props.path,
      keymap: props.keymap,
      y: props.collab?.y,
    })

    dispatch(UpdateText(text, undefined, markdown))
  }

  const onToggleTypewriterMode = () => {
    dispatch(UpdateConfig({...props.config, typewriterMode: !props.config.typewriterMode}))
  }

  const onToggleFullscreen = () => {
    dispatch(ToggleFullscreen)
  }

  const onVersion = () => {
    window.open(VERSION_URL, '_blank')
  }

  const onNew = () => {
    dispatch(New)
  }

  const onSaveAs = async () => {
    const path = await remote.save(editorView.state)
    if (path) {
      dispatch(UpdatePath(path))
    }
  }

  const onDiscard = () => {
    if (props.path) {
      dispatch(Discard)
    } else if (props.files.length > 0 && isEmpty(props.text?.editorState)) {
      dispatch(Discard)
    } else {
      selectAll(editorView.state, editorView.dispatch)
      deleteSelection(editorView.state, editorView.dispatch)
    }
  }

  const onCollab = () => {
    if (props.collab?.started) {
      dispatch(UpdateCollab({...props.collab, started: false}))
    } else {
      dispatch(UpdateCollab({started: true}))
    }
  }

  const onOpenInApp = () => {
    if (isElectron) return
    if (props.collab?.started) {
      window.open(`tinywrite://main?room=${props.collab.room}`, '_self')
    } else {
      const text = btoa(JSON.stringify(editorView.state.toJSON()))
      window.open(`tinywrite://main?text=${text}`, '_self')
    }
  }

  const onCopyCollabLink = () => {
    remote.copy(`${WEB_URL}/${props.collab.room}`).then(() => {
      editorView.focus()
      setLastAction('copy-collab-link')
    })
  }

  const onCopyCollabAppLink = () => {
    remote.copy(`tinywrite://${props.collab.room}`).then(() => {
      editorView.focus()
      setLastAction('copy-collab-app-link')
    })
  }

  const TextStats = () => {
    let paragraphs = 0
    let words = 0
    let loc = 0

    if (isInitialized(props.text?.editorState)) {
      (props.text.editorState as EditorState).doc.forEach((node) => {
        const text = node.textContent

        if (node.type.name === 'code_block') {
          loc += text.split('\n').length
          return
        }

        const curWords = text.split(/\s+/).filter(x => x != '').length
        if (node.type.name === 'paragraph' && curWords > 0) {
          paragraphs ++
        }

        words += curWords
      })
    }

    return (
      <>
        <Text>{words} words</Text>
        <Text>{paragraphs} paragraphs</Text>
        <Text>{loc} lines of code</Text>
      </>
    )
  }

  const LastModified = () => {
    const formatDate = (date: Date) => {
      const now = new Date()

      if (differenceInHours(now, date) <= 24) {
        return format(date, 'HH:mm:ss')
      } else if (date.getFullYear() === now.getFullYear()) {
        return format(date, 'dd MMMM HH:mm:ss')
      }

      return format(date, 'dd MMMM yyyy HH:mm:ss')
    }

    return props.lastModified ? (
      <Text data-testid="last-modified">Last modified {formatDate(props.lastModified)}</Text>
    ) : (
      <Text data-testid="last-modified">Nothing yet</Text>
    )
  }

  const FileLink = (props: {file: File}) => {
    const length = 24
    const getText = (node) => {
      let text = ''

      if (node.text) {
        text += node.text + ' '
      }

      if (node.content) {
        for (const child of node.content) {
          if (text.length >= length) {
            break
          }

          text += getText(child)
        }
      }

      return text
    }

    const text = props.file.path ?
      props.file.path.substring(props.file.path.length - length) :
      getText(props.file.text?.doc).substring(0, length)

    return (
      <Link
        onClick={() => dispatch(Open(props.file))}
        data-testid="open">
        {text} {props.file.path && '📎'}
      </Link>
    )
  }

  const Keys = ({keys}: {keys: string[]}) => (
    <span>{keys.map((k, i) => <i key={i}>{k}</i>)}</span>
  )

  useEffect(() => {
    setLastAction(undefined)
  }, [props.lastModified])

  useEffect(() => {
    if (!show) return
    const onKeyDown = (e) => {
      if (e.keyCode === 27) setShow(false)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [show])

  useEffect(() => {
    if (!lastAction) return
    const id = setTimeout(() => {
      setLastAction(undefined)
    }, 1000)
    return () => {
      clearTimeout(id)
    }
  }, [lastAction])

  return (
    <Container>
      <Burger onClick={onBurgerClick} active={show} data-testid="burger">
        <span />
        <span />
        <span />
      </Burger>
      {show && (
        <Off onClick={() => editorView.focus()}>
          <Menu>
            <Label>File {props.path && <i>({props.path.substring(props.path.length - 24)})</i>}</Label>
            <Sub>
              {isElectron && !props.path && (
                <Link onClick={onSaveAs}>Save to file <Keys keys={[mod, 's']} /></Link>
              )}
              <Link onClick={onNew} data-testid="new">
                New <Keys keys={[mod, 'n']} />
              </Link>
              <Link
                onClick={onDiscard}
                disabled={props.files.length === 0 && isEmpty(props.text?.editorState)}
                data-testid="discard">
                {
                  props.path ? 'Close' :
                  (props.files.length > 0 && isEmpty(props.text?.editorState)) ? 'Discard ⚠️' : 'Clear'
                } <Keys keys={[mod, 'w']} />
              </Link>
            </Sub>
            {props.files.length > 0 && (
              <>
                <Label>Files</Label>
                <Sub>
                  {props.files.map((file) => (
                    <FileLink key={file.lastModified} file={file} />
                  ))}
                </Sub>
              </>
            )}
            <Label>Edit</Label>
            <Sub>
              <Link onClick={onUndo}>Undo <Keys keys={[mod, 'z']} /></Link>
              <Link onClick={onRedo}>
                Redo <Keys keys={[mod, ...(isMac ? ['Shift', 'z'] : ['y'])]} />
              </Link>
              <Link onClick={cmd('cut')}>Cut <Keys keys={[mod, 'x']} /></Link>
              <Link onClick={cmd('paste')} disabled={!isElectron}>
                Paste <Keys keys={[mod, 'p']} />
              </Link>
              <Link onClick={cmd('copy')}>
                Copy {lastAction === 'copy' && '📋'} <Keys keys={[mod, 'c']} />
              </Link>
              <Link onClick={onCopyAllAsMd}>
                Copy all as markdown {lastAction === 'copy-md' && '📋'}
              </Link>
            </Sub>
            <Label>Theme</Label>
            <Sub>
              {Object.entries(themes).map(([key, value]) => (
                <Link key={key} onClick={onChangeTheme(key)}>
                  {value.label}{' '}{key === props.config.theme && '✅'}
                </Link>
              ))}
            </Sub>
            <Label>Code</Label>
            <Sub>
              {Object.entries(codeThemes).map(([key, value]) => (
                <Link key={key} onClick={onChangeCodeTheme(key)}>
                  {value.label}{' '}{key === props.config.codeTheme && '✅'}
                </Link>
              ))}
            </Sub>
            <Label>Font</Label>
            <Sub>
              {Object.entries(fonts).map(([key, value]) => (
                <Link key={key} onClick={onChangeFont(key)}>
                  {value.label}{' '}{key === props.config.font && '✅'}
                </Link>
              ))}
            </Sub>
            <Label>View</Label>
            <Sub>
              {isElectron && (
                <Link onClick={onToggleFullscreen}>
                  Fullscreen {props.fullscreen && '✅'} <Keys keys={[alt, 'Enter']} />
                </Link>
              )}
              <Link onClick={onToggleMarkdown} data-testid="markdown">
                Markdown mode {props.markdown && '✅'}
              </Link>
              <Link onClick={onToggleTypewriterMode}>
                Typewriter mode {props.config.typewriterMode && '✅'}
              </Link>
              {isElectron && (
                <Link onClick={onToggleAlwaysOnTop}>
                  Always on Top {props.config.alwaysOnTop && '✅'}
                </Link>
              )}
              <Text>
                Font size:
                <Slider
                  type="range"
                  min="8"
                  max="48"
                  value={props.config.fontSize}
                  onChange={onChangeFontSize} />
                {props.config.fontSize}
              </Text>
              <Text>
                Content width:
                <Slider
                  type="range"
                  min="600"
                  max="1400"
                  step="100"
                  value={props.config.contentWidth}
                  onChange={onChangeContentWidth} />
                {props.config.contentWidth}
              </Text>
            </Sub>
            <Label>Collab</Label>
            <Sub>
              <Link
                onClick={onCollab}
                title={props.collab?.error ? 'Connection error' : ''}>
                {collabText}
              </Link>
              {collabUsers > 0 && (
                <>
                  <Link onClick={onCopyCollabLink}>
                    Copy Link {lastAction === 'copy-collab-link' && '📋'}
                  </Link>
                  <Link onClick={onCopyCollabAppLink}>
                    Copy App Link {lastAction === 'copy-collab-app-link' && '📋'}
                  </Link>
                  <Text>
                    {collabUsers} {collabUsers === 1 ? 'user' : 'users'} connected
                  </Text>
                </>
              )}
            </Sub>
            <Label>Stats</Label>
            <Sub>
              <LastModified />
              <TextStats />
            </Sub>
            <Label>Application</Label>
            <Sub>
              {!isElectron && (
                <Link onClick={onOpenInApp}>
                  Open in App ⚡
                </Link>
              )}
              <Link onClick={onVersion}>
                About Version {version}
              </Link>
              {isElectron && (
                <Link onClick={() => remote.quit()}>Quit <Keys keys={[mod, 'q']} /></Link>
              )}
            </Sub>
          </Menu>
        </Off>
      )}
    </Container>
  )
}
