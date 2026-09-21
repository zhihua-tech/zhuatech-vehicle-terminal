/**
 * 上海如静知华信息科技有限公司 https://www.zhuatech.cn/
 * 商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。
 */
import crypto from'node:crypto';
const now=()=>new Date().toISOString(),uid=p=>`${p}_${crypto.randomUUID().replaceAll('-','').slice(0,12)}`,clone=v=>structuredClone(v),required=(v,n)=>{if(v===undefined||v===null||String(v).trim()==='')throw new Error(`${n}不能为空`);return String(v).trim()};
const distance=(a,b)=>{const r=6371000,p1=a.latitude*Math.PI/180,p2=b.latitude*Math.PI/180,dp=(b.latitude-a.latitude)*Math.PI/180,dl=(b.longitude-a.longitude)*Math.PI/180,h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return 2*r*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))};

/**
 * 车载作业终端领域服务，覆盖车辆、司机、终端、任务、车检、定位、围栏、站点、事件和指令回执。
 * 商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。
 */
export class VehicleTerminalService {
  /** 初始化车载终端领域状态。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  constructor(seed={}){for(const k of['depots','vehicles','drivers','terminals','trips','telemetry','alerts','incidents','commands'])this[k]=new Map((seed[k]||[]).map(x=>[x.id,x]));this.audit=seed.audit||[]}

  /** 建立车队场站与默认限速。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  createDepot(input,actor='admin'){const code=required(input.code,'场站编码');if([...this.depots.values()].some(x=>x.code===code))throw new Error('场站编码已存在');const d={id:uid('depot'),code,name:required(input.name,'场站名称'),address:required(input.address,'地址'),speedLimitKph:Number(input.speedLimitKph||80),status:'active',createdAt:now()};this.depots.set(d.id,d);this.#record(actor,'DEPOT_CREATED',d.id,{code});return clone(d)}

  /** 登记运营车辆及载重、能源和状态信息。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  registerVehicle(input,actor='fleet-admin'){if(!this.depots.has(input.depotId))throw new Error('场站不存在');const plate=required(input.plate,'车牌号').toUpperCase();if([...this.vehicles.values()].some(x=>x.plate===plate))throw new Error('车牌号已存在');const v={id:uid('veh'),depotId:input.depotId,plate,vin:required(input.vin,'VIN'),type:input.type||'厢式运输车',energyType:input.energyType||'electric',capacityKg:Number(input.capacityKg||1500),status:'available',odometerKm:Number(input.odometerKm||0),createdAt:now()};this.vehicles.set(v.id,v);this.#record(actor,'VEHICLE_REGISTERED',v.id,{plate});return clone(v)}

  /** 建立司机档案并校验证照有效期。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  createDriver(input,actor='hr'){const employeeNo=required(input.employeeNo,'工号');if([...this.drivers.values()].some(x=>x.employeeNo===employeeNo))throw new Error('司机工号已存在');const expiresAt=required(input.licenseExpiresAt,'证照有效期');if(Date.parse(expiresAt)<=Date.now())throw new Error('驾驶证已过期');const d={id:uid('drv'),employeeNo,name:required(input.name,'司机姓名'),licenseType:input.licenseType||'C1',licenseExpiresAt:expiresAt,status:'active',createdAt:now()};this.drivers.set(d.id,d);this.#record(actor,'DRIVER_CREATED',d.id,{employeeNo});return clone(d)}

  /** 将车载终端唯一绑定到车辆并发放设备令牌。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  bindTerminal(input,actor='engineer'){if(!this.vehicles.has(input.vehicleId))throw new Error('车辆不存在');if([...this.terminals.values()].some(x=>x.vehicleId===input.vehicleId))throw new Error('车辆已绑定终端');const serial=required(input.serial,'终端序列号');if([...this.terminals.values()].some(x=>x.serial===serial))throw new Error('序列号已存在');const t={id:uid('term'),vehicleId:input.vehicleId,serial,model:input.model||'VCT-10',status:'online',appVersion:input.appVersion||'1.0.0',token:crypto.randomBytes(18).toString('hex'),lastHeartbeatAt:now(),createdAt:now()};this.terminals.set(t.id,t);this.#record(actor,'TERMINAL_BOUND',t.id,{vehicleId:t.vehicleId});return clone(t)}

  /** 下发行程任务、顺序站点与地理围栏。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  createTrip(input,actor='dispatcher'){const vehicle=this.vehicles.get(input.vehicleId),driver=this.drivers.get(input.driverId);if(!vehicle||vehicle.status!=='available')throw new Error('车辆不可派单');if(!driver||driver.status!=='active'||Date.parse(driver.licenseExpiresAt)<=Date.now())throw new Error('司机不可派单');const stops=Array.isArray(input.stops)?input.stops:[];if(stops.length<2)throw new Error('行程至少需要两个站点');for(const s of stops){required(s.name,'站点名称');if(!Number.isFinite(Number(s.latitude))||!Number.isFinite(Number(s.longitude)))throw new Error('站点坐标无效')}
    const trip={id:uid('trip'),tripNo:`T${Date.now()}`,vehicleId:vehicle.id,driverId:driver.id,stops:stops.map((s,i)=>({sequence:i+1,name:s.name,latitude:Number(s.latitude),longitude:Number(s.longitude),radiusMeters:Number(s.radiusMeters||200),status:'pending',arrivedAt:null})),status:'assigned',inspection:null,currentStopSequence:0,startedAt:null,completedAt:null,createdAt:now()};vehicle.status='assigned';this.trips.set(trip.id,trip);this.#record(actor,'TRIP_ASSIGNED',trip.id,{vehicleId:vehicle.id,driverId:driver.id});return clone(trip)}

  /** 提交出车前检查，关键缺陷会阻止发车。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  submitInspection(tripId,input,actor='driver'){const trip=this.trips.get(tripId);if(!trip||!['assigned','blocked'].includes(trip.status))throw new Error('任务当前不可车检');const requiredItems=['brakes','tires','lights','documents'];const checks=input.checks||{};const failed=requiredItems.filter(k=>checks[k]!==true);trip.inspection={checks,notes:input.notes||'',passed:failed.length===0,failedItems:failed,submittedAt:now()};trip.status=failed.length?'blocked':'ready';if(failed.length){this.#alert(trip,'CRITICAL_INSPECTION',`车检未通过：${failed.join(',')}`,'critical')}this.#record(actor,'INSPECTION_SUBMITTED',trip.id,{passed:trip.inspection.passed,failed});return clone(trip)}

  /** 启动车载任务并锁定车辆、司机与终端上下文。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  startTrip(tripId,actor='driver'){const trip=this.trips.get(tripId);if(!trip||trip.status!=='ready'||!trip.inspection?.passed)throw new Error('任务未通过车检');const terminal=[...this.terminals.values()].find(x=>x.vehicleId===trip.vehicleId&&x.status==='online');if(!terminal)throw new Error('车载终端离线');trip.status='in-progress';trip.startedAt=now();this.vehicles.get(trip.vehicleId).status='in-service';this.#record(actor,'TRIP_STARTED',trip.id,{terminalId:terminal.id});return clone(trip)}

  /** 接收单调递增的遥测数据并实时识别超速、越界和急刹。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  ingestTelemetry(tripId,input){const trip=this.trips.get(tripId);if(!trip||trip.status!=='in-progress')throw new Error('行程不在执行中');const seq=Number(input.sequence),at=input.recordedAt||now(),last=[...this.telemetry.values()].filter(x=>x.tripId===trip.id).sort((a,b)=>b.sequence-a.sequence)[0];if(!Number.isInteger(seq)||(last&&seq<=last.sequence))throw new Error('遥测序号必须递增');if(last&&Date.parse(at)<Date.parse(last.recordedAt))throw new Error('遥测时间不能回退');const point={id:uid('gps'),tripId:trip.id,sequence:seq,latitude:Number(input.latitude),longitude:Number(input.longitude),speedKph:Number(input.speedKph||0),accelerationMps2:Number(input.accelerationMps2||0),batteryPercent:Number(input.batteryPercent??100),recordedAt:at};if(!Number.isFinite(point.latitude)||!Number.isFinite(point.longitude))throw new Error('定位坐标无效');this.telemetry.set(point.id,point);const depot=this.depots.get(this.vehicles.get(trip.vehicleId).depotId);if(point.speedKph>depot.speedLimitKph)this.#alert(trip,'OVERSPEED',`车速 ${point.speedKph}km/h 超过限制 ${depot.speedLimitKph}km/h`,'high');if(point.accelerationMps2<-4)this.#alert(trip,'HARSH_BRAKING','检测到急刹车','medium');const next=trip.stops.find(x=>x.sequence===trip.currentStopSequence+1);if(next&&distance(point,next)>next.radiusMeters*5)this.#alert(trip,'ROUTE_DEVIATION',`偏离下一站 ${next.name}`,'medium');return clone(point)}

  /** 按顺序确认到站并校验车辆处于站点围栏内。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  arriveStop(tripId,sequence,actor='driver'){const trip=this.trips.get(tripId);if(!trip||trip.status!=='in-progress')throw new Error('行程不在执行中');if(Number(sequence)!==trip.currentStopSequence+1)throw new Error('必须按计划顺序到站');const stop=trip.stops.find(x=>x.sequence===Number(sequence)),latest=[...this.telemetry.values()].filter(x=>x.tripId===trip.id).sort((a,b)=>b.sequence-a.sequence)[0];if(!latest||distance(latest,stop)>stop.radiusMeters)throw new Error('车辆尚未进入站点围栏');stop.status='arrived';stop.arrivedAt=now();trip.currentStopSequence=stop.sequence;this.#record(actor,'STOP_ARRIVED',trip.id,{sequence:stop.sequence,name:stop.name});return clone(trip)}

  /** 报告行车事件并按严重度生成运营告警。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  reportIncident(tripId,input,actor='driver'){const trip=this.trips.get(tripId);if(!trip||!['in-progress','blocked'].includes(trip.status))throw new Error('任务当前不可上报事件');const incident={id:uid('inc'),tripId:trip.id,type:required(input.type,'事件类型'),description:required(input.description,'事件说明'),severity:input.severity||'medium',attachments:input.attachments||[],status:'open',createdAt:now()};this.incidents.set(incident.id,incident);this.#alert(trip,'INCIDENT_REPORTED',incident.description,incident.severity);this.#record(actor,'INCIDENT_REPORTED',incident.id,{tripId});return clone(incident)}

  /** 向车载终端下发限速、消息或返场指令。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  issueCommand(input,actor='dispatcher'){const terminal=this.terminals.get(input.terminalId);if(!terminal)throw new Error('车载终端不存在');const type=required(input.type,'指令类型');if(!['message','speed-limit','return-depot'].includes(type))throw new Error('指令类型不支持');const command={id:uid('cmd'),terminalId:terminal.id,type,payload:input.payload||{},status:'pending',issuedAt:now(),acknowledgedAt:null};this.commands.set(command.id,command);this.#record(actor,'COMMAND_ISSUED',command.id,{type});return clone(command)}

  /** 记录车载终端指令回执并防止重复确认。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  acknowledgeCommand(commandId,input={}){const command=this.commands.get(commandId);if(!command||command.status!=='pending')throw new Error('指令不存在或已确认');command.status=input.accepted===false?'rejected':'acknowledged';command.message=input.message||'';command.acknowledgedAt=now();return clone(command)}

  /** 完成全部站点后的行程并释放车辆。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  completeTrip(tripId,actor='driver'){const trip=this.trips.get(tripId);if(!trip||trip.status!=='in-progress')throw new Error('行程当前不可完成');if(trip.stops.some(x=>x.status!=='arrived'))throw new Error('仍有未完成站点');trip.status='completed';trip.completedAt=now();this.vehicles.get(trip.vehicleId).status='available';this.#record(actor,'TRIP_COMPLETED',trip.id,{durationMinutes:Math.round((Date.parse(trip.completedAt)-Date.parse(trip.startedAt))/60000)});return clone(trip)}

  /** 汇总车队任务、在线终端、告警与安全数据。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  dashboard(){const trips=[...this.trips.values()],alerts=[...this.alerts.values()];return{metrics:{vehicles:this.vehicles.size,onlineTerminals:[...this.terminals.values()].filter(x=>x.status==='online').length,activeTrips:trips.filter(x=>x.status==='in-progress').length,readyTrips:trips.filter(x=>x.status==='ready').length,openAlerts:alerts.filter(x=>x.status==='open').length,openIncidents:[...this.incidents.values()].filter(x=>x.status==='open').length},vehicles:[...this.vehicles.values()],drivers:[...this.drivers.values()],terminals:[...this.terminals.values()],trips:trips.slice(-20).reverse(),telemetry:[...this.telemetry.values()].slice(-50).reverse(),alerts:alerts.slice(-20).reverse(),commands:[...this.commands.values()].slice(-20).reverse(),audit:this.audit.slice(-30).reverse()}}

  /** 导出本地持久化快照。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  dump(){const out={audit:this.audit};for(const k of['depots','vehicles','drivers','terminals','trips','telemetry','alerts','incidents','commands'])out[k]=[...this[k].values()];return out}
  /** 生成一分钟窗口内去重的安全告警。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  #alert(trip,type,message,severity){const duplicate=[...this.alerts.values()].some(x=>x.tripId===trip.id&&x.type===type&&x.status==='open'&&Date.now()-Date.parse(x.createdAt)<60000);if(duplicate)return;const a={id:uid('alert'),tripId:trip.id,vehicleId:trip.vehicleId,type,message,severity,status:'open',createdAt:now()};this.alerts.set(a.id,a)}
  /** 写入不可变审计事件。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
  #record(actor,action,resourceId,detail){this.audit.push({id:uid('aud'),actor,action,resourceId,detail,occurredAt:now()})}
}

/** 构造运行中的城配车载终端演示数据。商业授权或定制开发请微信添加微信号zhuatech或zhuatech2进行咨询。 */
export function createDemoService(){const s=new VehicleTerminalService(),d=s.createDepot({code:'SH-PD',name:'知华上海城配中心',address:'上海市浦东新区物流园',speedLimitKph:80}),v=s.registerVehicle({depotId:d.id,plate:'沪A·ZH001',vin:'LZHDEMO0000000001',capacityKg:1800}),driver=s.createDriver({employeeNo:'D001',name:'陈师傅',licenseExpiresAt:'2030-12-31'}),t=s.bindTerminal({vehicleId:v.id,serial:'VCT-SH-001',model:'10寸工业车机'}),trip=s.createTrip({vehicleId:v.id,driverId:driver.id,stops:[{name:'浦东配送中心',latitude:31.2304,longitude:121.4737,radiusMeters:500},{name:'张江客户点',latitude:31.204,longitude:121.598,radiusMeters:500}]});s.submitInspection(trip.id,{checks:{brakes:true,tires:true,lights:true,documents:true}});s.startTrip(trip.id);s.ingestTelemetry(trip.id,{sequence:1,latitude:31.2304,longitude:121.4737,speedKph:20,batteryPercent:86});s.arriveStop(trip.id,1);s.issueCommand({terminalId:t.id,type:'message',payload:{text:'雨天行车，请注意安全'}});return s}
