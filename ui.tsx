import { computed, observable } from "mobx"
import { observer } from "mobx-react"
import * as React from "react"
import { render } from "react-dom"
import { Bracket } from "react-tournament-bracket"
import { Game, SideInfo } from "react-tournament-bracket/lib/components/model"
import BracketGame from "./BracketGame"

// examples
type Events =
	| {
			event: "score"
			scores: [
				{ score: 3861; competitor: "🦜" },
				{ score: 11295; competitor: "🐢" }
			]
	  }
	| { event: "start"; bracket: BracketData }

type Competitor = { score: number; competitor: string }
type BracketData = {
	upcoming: [["🐍", "🐉"], ["🐳", "🐬"]]
	current: {
		extra: {
			commentary: [
				"Uh oh. 🦜 has had words with 🐢 before. The next match will be good."
			]
			end_time: "2019-04-01T19:44:20.70275514Z"
		}
		game: [
			{ score: 3289; competitor: "🦜" },
			{ score: 9717; competitor: "🐢" }
		]
	}
	played: [
		[
			{
				extra: {
					commentary: string[] /*[
						"Duck... duck... duck... duck... owl!",
						"You just know that 🦆 is thinking about 🏥 right now.",
						"Will it be 🦆 or 🦉? Find out next after this message from our sponsors."
					]*/
					end_time: string /*"2019-04-01T19:43:05.701366707Z"*/
				}
				game: [
					Competitor, //{ score: 6558; competitor: "🦆" },
					Competitor
				]
			}
		]
	]
}

@observer
class UI extends React.Component {
	@observable startLevel = 2
	ws: WebSocket

	@observable bracket: BracketData | null = null
	constructor(props: {}) {
		super(props)
		Object.assign(window, { ui: this })
		console.log("made")
		this.ws = new WebSocket("wss://emojidome.xkcd.com/2131/socket")
		this.ws.addEventListener("message", this.onMessage)
	}
	onMessage = (message: MessageEvent) => {
		const data: Events = JSON.parse(message.data)
		console.log(data.event)
		if (data.event === "start") {
			this.bracket = data.bracket
		}
	}

	@computed
	get renderableData(): Game | null {
		if (this.bracket === null) return null
		const startLevel = Math.max(0, Math.min(this.startLevel, 8))
		const maxLevel = 8 - startLevel
		const levels = this.bracket.played
			.map(level => level.slice().reverse())
			.reverse()
			.slice(startLevel)
		if (levels.length > 0)
			levels[levels.length - 1].push(
				this.bracket.current,
				...this.bracket.upcoming.map(([l, r]) => ({
					extra: { commentary: [], end_time: "unknown" },
					game: [
						{ score: 0, competitor: l },
						{ score: 0, competitor: r },
					] as [Competitor, Competitor],
				})),
			)
		for (const [i, level] of levels.entries()) {
			if (level.length !== 2 ** (maxLevel - i))
				console.log(
					"level",
					i,
					"should be length",
					2 ** (maxLevel - i),
					"but is",
					level.length,
				)
		}
		function getGame(level: number, index: number): Game | null {
			if (level < 0) return null
			const info = level < levels.length ? levels[level][index] : null

			function mkSide(
				competitor: Competitor | null,
				offset: 0 | 1,
			): SideInfo {
				const sourceGame = getGame(level - 1, index * 2 + offset)
				return {
					score: competitor ? { score: competitor.score } : undefined,
					team: {
						id: competitor ? competitor.competitor : "unknown",
						name: competitor ? competitor.competitor : "unknown",
					},
					seed: sourceGame
						? {
								displayName: "idk lol",
								rank: 1,
								sourceGame,
								sourcePool: (null as any) as object,
						  }
						: undefined,
				}
			}

			return {
				id: `level-${level},index-${index}`,
				name: info
					? info.extra.commentary[0]
					: `Unknown (${level}-${index})`,
				//bracketLabel: "yo",
				scheduled: info ? new Date(info.extra.end_time).valueOf() : NaN,
				sides: {
					home: mkSide(info ? info.game[0] : null, 0),
					visitor: mkSide(info ? info.game[1] : null, 1),
				},
			}
		}
		const game = getGame(maxLevel, 0)
		console.log(game)
		return game
	}
	click = (game: Game) => {
		this.selectedGame = game
	}
	@observable selectedGame: Game | null = null
	render() {
		return (
			<div>
				<h1>
					Emojidome Live Bracket Viewer{" "}
					<small>
						<small>
							<small>
								<a href="https://github.com/phiresky/emojidome">
									Source on GitHub
								</a>
							</small>
						</small>
					</small>
				</h1>

				<div>
					Hiding first {this.startLevel} levels{" "}
					<button onClick={e => this.startLevel--}>-</button>
					<button onClick={e => this.startLevel++}>+</button>
				</div>
				{(() => {
					if (this.renderableData)
						return (
							<Bracket
								game={this.renderableData}
								gameDimensions={{ width: 80, height: 84 }}
								homeOnTop={true}
								GameComponent={props => (
									<BracketGame
										tooltip={() => (
											<span>
												{props.game.sides.home.team
													? props.game.sides.home.team
															.name
													: "?"}
												{" vs "}
												{props.game.sides.visitor.team
													? props.game.sides.visitor
															.team.name
													: "?"}
												{": "}"{props.game.name}"
											</span>
										)}
										{...props}
									/>
								)}
							/>
						)
					return <div>loading...</div>
				})()}
			</div>
		)
	}
}

render(<UI />, document.getElementById("root"))
