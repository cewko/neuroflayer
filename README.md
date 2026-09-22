# neuroflayer

## commands

| command | action |
| ------- | ------ |
| `<message>` | send an in-game message |
| `/command` | execute a minecraft command |
| `:help` | show neuroflayer commands |
| `:status` | show neuroflayer status |
| `:llm <on/off>` | toggle replies |
| `:memory <on/off>` | toggle memory. "off" clears history |
| `:forget` | clear conversation history and cancel pending replies |
| `:ask <question>` | ask the LLM; answers in the console |
| `:parser [index\|name]` | show available message parsers \| select a specific one |
| `:respawn` | respawn after death |
| `:quit` | disconnect and end session |

## environment

| variable | default | description |
| -------- | ------- | ----------- |
| `MINECRAFT_HOST` | required | minecraft server address |
| `MINECRAFT_PORT` | `25565` | minecraft server port |
| `MINECRAFT_USERNAME` | required | username for offline-mode login |
| `MINECRAFT_VERSION` | auto | minecraft version used by mineflayer |
| `MINECRAFT_LOG_MESSAGES` | `true` | log minecraft messages to the console |
| `LLM_URL` | required | API endpoint |
| `LLM_MODEL` | required | model used to generate replies |
| `LLM_PROMPT_PATH` | `./prompt` | path to the instruction prompt |
| `LLM_TIMEOUT_MS` | `45000` | maximum time spent waiting for an LLM response |
| `LLM_MAX_TOKENS` | `512` | max tokens generated per answer |
| `LLM_TEMPERATURE` | `0.9` | sampling temperature from `0` to `2`; lower values make replies more predictable, higher values make them more varied |
| `MAX_MESSAGE_LENGTH` | `256` | character limit per outgoing message |
| `MAX_PENDING_MESSAGES` | `8` | maximum questions waiting in the queue |
| `QUEUE_TTL_SECONDS` | `120` | seconds before a queued request expires |
| `MEMORY_MAX_MESSAGES` | `30` | maximum messages used as context |
| `MEMORY_TTL_SECONDS` | `600` | seconds of inactivity before memory clears |

## setup

requires Node.js 22+ and a running LLM server supporting the `grammar` parameter, such as llama.cpp. from the neuroflayer directory, run the following:

```sh
npm install
cp -n .env.example .env
touch prompt
```

fill in the required `.env` values and modify `prompt` for your needs, then:

```sh
npm start
```
