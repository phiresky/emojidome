import { observable } from "mobx"
import { observer } from "mobx-react"
import * as React from "react"
import { render } from "react-dom"

@observer
class UI extends React.Component {
	@observable i = 0
	render() {
		return <div>hello world</div>
	}
}
render(<UI />, document.getElementById("root"))
