import React from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { p, formatTime } from './tools'
import { streamer } from './streamers'
import { withTracker } from 'meteor/react-meteor-data'
import { Scripts, Trails, Responses, Tasks } from './collections'
import { moment } from 'meteor/momentjs:moment'
import Modal from 'react-modal'
// import Modal from 'react-responsive-modal'

const FORMAT_DATE = 'HH:mm:ss DD/MM/YYYY'
const FORMAT_HOURS = 'HH:mm:ss'
const sidebarItems = [
    <i className="far fa-comment"></i>,
    <i className="far fa-file"></i>,
    <i className="fas fa-vial"></i>,
    <i className="far fa-copy"></i>
]
const titlesSidebarItems = [
	'Comandos y Script',
	'Lista de Scripts',
	'Prueba de Equipos',
	'Envio masivo de Scripts'
]

Modal.setAppElement('#root')

class App extends React.Component{
    state = {
        sideUp: 0,
		commands: [],
		modalIsOpen: false,
		mobileIDTask: null,
		fiMobile: ''
    }
	componentDidMount(){
		// SERACH SCRIPT FILE
		searchFile()
		//STREAMER ON
		streamer.on('log', message => p(message))
		streamer.on('modal', message => swal("OK", message, "success"))
	}
	OnChangeInputCMD(event, index){
		let commands = this.state.commands
		commands[index] = event.target.value
		this.setState({commands: commands})
	}
	SendCommand(mobileID, command){
		if(command && command.length > 0){
			cmd(mobileID, command)
			toast( `Comando ${command} enviado a ${mobileID}` )
		}
	}
	OpenModal(mobileID) {
		this.setState({mobileIDTask: mobileID})
		this.setState({modalIsOpen: true})
	}
	CloseModal() {
		this.setState({modalIsOpen: false})
		this.setState({mobileIDTask: null})
	}
	CreateTask (mobileID, scriptID , scriptName){
		this.CloseModal()
		swal({
		  title: "Estas seguro?",
		  text: `IMEI : ${mobileID} \n Script: ${scriptName}`,
		  type: "warning",
		  showCancelButton: true,
		  confirmButtonColor: "#009688",
		  confirmButtonText: "Crear tarea",
		  closeOnConfirm: true,
		  html: false
		}, function(){
		  Meteor.call('saveTask', mobileID, scriptID)
		 // toast.success( `Tarea Creada \n IMEI : ${mobileID} \n Script: ${scriptName}` )
		});
	}
	InternalModal(mobileID){

		const { scripts } = this.props
		if(scripts && this.state.mobileIDTask == mobileID){
			return (
                <Modal isOpen={this.state.modalIsOpen} onRequestClose={ns=>this.CloseModal()} style={customStyles}>
					<div className="w3-right">
						<button className="w3-button w3-circle w3-small w3-red w3-card" onClick={ns => this.CloseModal()}><i className="fas fa-times"></i></button>
					</div>
					<ul className="w3-ul w3-white w3-hoverable" style={{width:"230px", marginTop: '40px'}}>
					  {scripts.map(el => <li className="ellipsis cursor" key={el._id} onClick={ns=> this.CreateTask(mobileID, el._id, el.name)}>{el.name}</li>)}
					</ul>
				</Modal>
			)			
		}else{
			return null
		}

	}
	getResponse(mobileID){
		const { responses } = this.props
			
		const response =  responses.length > 0 ? responses.filter(el => el.mobileID == mobileID )[0]: false
		
		return response ?  
				(<div>
					<div> <span className="w3-small word-wrap ellipsis">{response.data}  </span> </div>
					<div> <span className="w3-small w3-display-bottomright"> {moment(response.now).format(FORMAT_HOURS)} </span> </div>
		       </div>) : null

	}
	getTaskPorcent(mobileID){
		const { tasks } = this.props
		const task = tasks && tasks.length > 0 ? tasks.filter(el => el.mobileID == mobileID)[0]:false
		const totalCommands = task ? task.commands.length : 0
		const status2Command = task ? task.commands.filter(el => el.status == 2).length : 0
		const porcent = totalCommands && status2Command ? parseInt(status2Command*100/totalCommands): 0
		return porcent ? <div className="w3-tiny w3-light-gray w3-round"> <div className="w3-indigo w3-round w3-center" style={{width:`${porcent}%`}}>{porcent}%</div> </div> : <div className="w3-tiny w3-light-gray w3-round">0%</div> 
	}
	removeScript(name){
	
		swal({
		  title: "Estas seguro de eliminar?",
		  text: `Script: ${name}`,
		  type: "warning",
		  showCancelButton: true,
		  confirmButtonColor: "#ee0000",
		  confirmButtonText: "Eliminar",
		  closeOnConfirm: true,
		  html: false
		}, function(){
		 Meteor.call('removeScript', name)
		});
	}
	filterMobileID(event){
		this.setState({fiMobile: event.target.value.toString().trim()})
	}
	renderTrails(){
		const { trails } = this.props

		if(trails.length > 0){
			return(
				<div className="w3-row" >
					{trails.map((el, index) => el.mobileID.includes(this.state.fiMobile)?
							<div className="w3-col s3 w3-mobile w3-dark-grey margin-small padding w3-round w3-card" key={el._id}>
								{this.InternalModal(el.mobileID)}
								<div>  <span className="w3-large"> {el.mobileID} </span> </div>
								{this.getTaskPorcent(el.mobileID)}
															
							    <div className="w3-col w3-light-gray w3-round padding-horizontal margin-vertical w3-display-container" style={{width:"89%", height:"80px"}}>
								
									{this.getResponse(el.mobileID)}
								  
								</div>
								
								<div className="w3-rest w3-right icon-padding">
									 <span className="cursor" onClick={ns=>this.OpenModal(el.mobileID)}><i className="w3-large w3-text-white far fa-file"></i></span> 
								</div>

						
								<div className="w3-col" style={{width:'87%'}}>
								  <input className="w3-input w3-round" type="text" placeholder=">" onChange={event => this.OnChangeInputCMD(event, index)}/>
								</div>
								
								<div className="w3-rest w3-right icon-padding">
									<span className="cursor" onClick={ns => this.SendCommand(el.mobileID, this.state.commands[index])}><i className="w3-large  w3-text-white fas fa-fighter-jet"></i></span> 
								</div>
								
					 </div>: null)}
				</div>)
		}else{
			return null
		}		
	}
	renderScripts(){
		const { scripts } = this.props
			return( 
			<div>
				<div className="w3-right">
					<button className="w3-button w3-circle w3-teal w3-card" onClick={ns => document.getElementById('scriptFile').click()}><i className="fas fa-plus"></i></button>
				</div>
				<div className="w3-row">
					{scripts.map((el,index) => <div className="w3-col s2 w3-mobile margin-small w3-padding-small w3-round w3-white w3-card" key={el._id}>
						<div> <span className="ellipsis">Script : {el.name}</span></div>
						<div> <span className="ellipsis">Numero de lineas : {el.commands.length}</span></div>
						<div> <span className="ellipsis">Creado : {moment(el.createdAt).format(FORMAT_DATE)}</span></div>
						<div className="w3-right">
							<button className="w3-button w3-circle w3-red w3-card" onClick={ns => this.removeScript(el.name)}><i className="fas fa-times"></i></button>
						</div>
					</div>)}
				</div>
						
			</div>)		
		
	}
	renderSideContent(){
		switch(this.state.sideUp){
			case 0: return this.renderTrails(); break;
			case 1: return this.renderScripts(); break;
			case 2: return <button className="w3-button w3-black w3-round-small" id="scriptFile">Pronto</button>; break;
			case 3: return <button className="w3-button w3-black w3-round-small" id="scriptFile">Pronto</button>; break;
		}
	}
	render(){
		const { trails } = this.props
		return (<div>
            <div className="w3-bar w3-indigo w3-card w3-top">
				<a href="#" className="w3-bar-item w3-button w3-hover-none"><span><b>FIGO</b></span></a>
				<a href="#" className="w3-bar-item w3-button w3-hover-none"><span><input className="search w3-round" type="text" placeholder="Filtrar IMEI" onChange={event=>this.filterMobileID(event)}/></span></a>
				<a href="#" className="w3-bar-item w3-button w3-hover-none"><span className="w3-small"><b>{trails&&trails.length>0?trails.length:0} Online</b></span></a>
           </div>
            <div className="w3-sidebar w3-bar-block w3-indigo w3-large" style={styles.sidebar}>
                {sidebarItems.map((el, index) => <a href="#" className={`w3-bar-item w3-button  ${this.state.sideUp == index ? 'w3-indigo' : ''}`} 
				key={index} onClick={ns => this.setState({ sideUp: index })} title={titlesSidebarItems[index]}>{el}</a>)}
            </div>
            <div style={styles.content}>
                {this.renderSideContent()}
            </div>
 	        <input id="scriptFile" type="file" style={styles.hide}/>
            <ToastContainer />
        </div>)
	}
}
export default withTracker(() => {
    const scripts = Meteor.subscribe('scripts')
    const trails = Meteor.subscribe('trails')
	const responses = Meteor.subscribe('responses')
	const tasks = Meteor.subscribe('tasks')
    return {
        scripts: Scripts.find({}).fetch(),
        trails: Trails.find({}).fetch(),
		responses: Responses.find({}).fetch(),
		tasks: Tasks.find({}).fetch()
    }
})(App)

// STYLES
const styles = {
    sidebar: {
		position: 'fixed',
		top: '38px',
        width: '48px',
		right: '0px',
    },
    content: {
        position: 'absolute',
        left: '0px',
        top: '40px',
		right: '64px',
		lineHeight: 1.2,
		// padding: '8px',
		// width: '100%'
    },
	hide: {
		display: 'none'
	}
}

const customStyles = {
  content : {
    top                   : '50%',
    left                  : '50%',
    right                 : 'auto',
    bottom                : 'auto',
    marginRight           : '-50%',
    transform             : 'translate(-50%, -50%)',
	backgroundColor		  : 'white'
  }
}

// SEARCH SCRIPT FILE
const searchFile = () => {
		document.getElementById('scriptFile')
		.addEventListener('change', event => {
             if(event.target.files[0]){
            	const file = event.target.files[0]
            	const reader = new FileReader()
            	reader.onload = () => {
            		const scriptFile = { name: file.name, file: reader.result }
            		Meteor.call('saveScript', scriptFile, (error, success) => success ? Session.set('scriptFile', scriptFile) : false )
        		}
        		reader.readAsText(file)
            }
        })
}
// CLIENT SEND CMD
cmd = (mobileID, message) => {
	message = message.toString().includes('>')|| message.toString().includes('<') ? message.toString().toUpperCase() : `>${message.toString().toUpperCase()}<`
	mobileID = mobileID.toString().trim()
	Meteor.call('socketSend', mobileID, message)
	return 'Send'
}
