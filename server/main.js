const net = require('net')

import { p , now, formatTime} from '../imports/tools'
import { streamer } from '../imports/streamers'
import { Tasks, Trails, Scripts, Responses } from '../imports/collections'
	
// PUBLISH
Meteor.publish('scripts', ns => Scripts.find({}))
Meteor.publish('trails', ns => Trails.find({}))
Meteor.publish('responses', ns => Responses.find({}))
Meteor.publish('tasks', ns => Tasks.find({}))

const DISCONNECT_DEVICE_CMD = '>SXADP02U<'
// const RESET_DEVICE_CMD = '>SRT<'
const TIME_DISCONNECT_DEVICE = 2000

let sockets = {}

export default class SyrusT {

	constructor(port){
		

		this.server = net.createServer( Meteor.bindEnvironment(socket => {
		  // 'connection' listener
		  // console.log('client connected')

		  socket.on('end', Meteor.bindEnvironment(() => {
		    delete sockets[socket.mobileID]
		    Meteor.call('removeTrail', socket.mobileID)
		    // console.log(`${socket.mobileID} has disconnected`)
		  }))

	      socket.on('data', Meteor.bindEnvironment(data => {
	    	p(data.toString().trim())
	    	streamer.emit('log', formatTime(now())+' '+data.toString().trim())
	    	this.mobileMessage = data.toString().trim()

		    if(!sockets[socket.mobileID]) {
		      

		      socket.mobileID = this.getMobileID()
		      sockets[socket.mobileID] = socket
		      
		    }
		    this.route()
	  	  }))

		}))
		this.server.listen( port || 7100, Meteor.bindEnvironment(() => {
			console.log('Server Up in port '+ this.server.address().port)
			Meteor.call('removeAllTrails')
		}))

	}
	getMobileID(){
		const mm = this.mobileMessage

		let mobileID

		mm.indexOf('>REV') == 0 ? mobileID = mm.slice( mm.indexOf('ID=') + 3, mm.indexOf('<') ) : false
		
		mm.indexOf('>') == 0 && mm.indexOf('REV') == -1 ? mobileID = mm.slice(mm.indexOf('ID=') + 3, mm.indexOf('<')) : false

		mm.indexOf('>') == -1 && mm.indexOf('<') == -1 ? mobileID = this.mobileMessage : false

		return mobileID
		
	}
	route(){
		const mm = this.mobileMessage
		mm.indexOf('>REV') == 0 ? this.trail() :false
		
		mm.indexOf('>') == 0 && mm.indexOf('REV') == -1 ? this.response():false
		
		mm.indexOf('>') == -1 && mm.indexOf('<') == -1 ? this.heartbeat():false
		
	}
	response(){
		//p('response')
		const mm = this.mobileMessage
		const mobileID = mm.slice(mm.indexOf('ID=') + 3, mm.indexOf('<'))
		Meteor.call('upsertResponse', mobileID, mm)
		Meteor.call('socketSend', mobileID, mobileID)
		Meteor.call('upsertTrail', mobileID )

		this.taskWorker(mobileID, mm)
	}
	trail(){
		//p('trail')
		const mm = this.mobileMessage
		const mobileID = mm.slice(mm.indexOf('ID=') + 3, mm.indexOf('<'))
		Meteor.call('socketSend', mobileID, mobileID)
		Meteor.call('upsertTrail', mobileID )
		this.syncWorker(mobileID)
	}
	heartbeat(){
		//p('heartbeat')
		const mobileID = this.mobileMessage
		Meteor.call('socketSend', mobileID, mobileID)
		Meteor.call('upsertTrail', mobileID)
		this.syncWorker(mobileID)
	}
	taskWorker(mobileID, message) {
        const task = Meteor.call('getTask', mobileID)
        const commands = task ? task.commands : false
        if (commands) {
            commands.map((el, i, array) => {

                if (el.status == 1) {
                    Meteor.call('status2CommandTask', mobileID, el.index, ns => {
                        if (el.index == commands.length) {
                            Meteor.call('status2Task', mobileID, ns => {
                                streamer.emit('log', formatTime(now())+' '+`Tarea de ${mobileID} Terminada`)
                                streamer.emit('modal', `Tarea de ${mobileID} Terminada`)

								Meteor.setTimeout(()=>{
									Meteor.call('socketSend', mobileID, DISCONNECT_DEVICE_CMD)
									//Meteor.call('socketSend', mobileID, RESET_DEVICE_CMD)
									
									Meteor.setTimeout(()=>{
										Meteor.call('removeTrail', mobileID)
										Meteor.call('removeTask', mobileID)
									}, 1000)
									
								},TIME_DISCONNECT_DEVICE)


                            })
                        }
                        if (array[i + 1] && array[i + 1].command) {
                            Meteor.call('socketSend', mobileID, array[i + 1].command, ns => {
                                Meteor.call('status1CommandTask', mobileID, array[i + 1].index)
                            })
                        }
                    })
                }
            })
        }
    }
    syncWorker(mobileID){
    	const task = Meteor.call('getTask', mobileID)
    	if(task){
    		//const cmd0 = task.commands.filter(el=> el.status == 0)[0]
    		const cmd1 = task.commands.filter(el=> el.status == 1)[0]
    		//const cmd2 = task.commands.filter(el=> el.status == 2)[0]
    		cmd1 ? Meteor.call('socketSend', mobileID, cmd1.command): false
    	}
    }
}

new SyrusT()


/* METEOR METHODS */
Meteor.methods({
	// SERVER TCP
	socketSend: (mobileID, message) =>{
		sockets[mobileID].write(message)
	},
	getConnections : () => {
		return Object.keys(sockets).length
	},
	// TRAILS
	upsertTrail: (mobileID) => {
		Trails.upsert({ mobileID }, { $set: { now: now() } })
	},
	/*
	getTrail: (mobileID) => {
		return Trails.findOne({ mobileID })
	},*/
	removeTrail: (mobileID) => {
		Trails.remove({mobileID})
	},
	removeAllTrails: () => {
		Trails.remove({})
	},
	// SCRIPTS
	saveScript: (scriptFile) => {
		const { name, file } = scriptFile
		let commands = []

		if(file.includes('>S') && file.includes('<') ){
	        
	        const lines = file.split('\r\n').filter(line => {
				return line.startsWith('>') &&
					   !line.includes('SRT;ALL') &&
					   !line.includes('SXADP02') &&
					   !line.includes('SRFA') &&
					   !line.includes('SID')
	        })
	        if (lines.length > 0) {
	            commands = lines.map((line, index) => {
	                return {
	                    index: (index + 1),
	                    command: line.trim(),
	                   // hopeResponse: line.replace('>S', '>R').substr(0, line.length - 1).trim()
	                }
	            })
	        }
	        const scriptUpsert = Scripts.upsert({ name }, { $set: { commands, createdAt: now() } })
	        return commands.length > 0 && scriptUpsert && scriptUpsert.numberAffected == 1 ? true : false
       }
	},
	removeScript: (name) => {
		Scripts.remove({name})
	},
	// TASKS
    saveTask: (mobileID, scriptID) => {
        const scriptToTask = Scripts.findOne({ _id: scriptID }, { fields: { _id: 0, createdAt: 0 } })
        scriptToTask.commands.map(el => el.status = 0)
        scriptToTask.status = 0
        scriptToTask.createdAt = now()
        Tasks.upsert({ mobileID }, { $set: scriptToTask })
        const task = Tasks.findOne({ mobileID })
        const firtsCommand = task.commands[0].command
        Meteor.call('socketSend', mobileID, firtsCommand, ns => {
            Tasks.update({ _id: task._id, "commands.index": 1 }, { $set: { "commands.$.status": 1, "commands.$.lastSendTime": now() } })
            Tasks.update({ _id: task._id }, { $set: { status: 1 } })
        })
    },
    getTask: (mobileID) => {
        return Tasks.findOne({ mobileID })
    },
    status2CommandTask: (mobileID, index) => {
        Tasks.update({ mobileID, "commands.index": index }, { $set: { "commands.$.status": 2, "commands.$.lastReceivedTime": now() } })
    },
    status1CommandTask: (mobileID, index) => {
        Tasks.update({ mobileID, "commands.index": index }, { $set: { "commands.$.status": 1, "commands.$.lastSendTime": now() } })
    },
    status2Task: (mobileID) => {
        Tasks.update({ mobileID }, { $set: { status: 2, endTime: now() } })
    },
	removeTask: (mobileID) => {
		Tasks.remove({mobileID})
	},
	// RESPONSES
	upsertResponse: (mobileID, data) => {
		Responses.upsert({ mobileID }, { $set: { data, now: now() } })
	},

})


