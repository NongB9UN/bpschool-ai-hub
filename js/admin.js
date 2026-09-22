const keyField=document.getElementById('secret'),result=document.getElementById('result'),dateField=document.getElementById('date');
dateField.value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
async function read(path){
 if(!keyField.value){result.textContent='กรอกรหัสเข้าถึงก่อน';return;}
 result.textContent='กำลังตรวจสอบ…';
 try{const response=await fetch(path,{headers:{Authorization:`Bearer ${keyField.value}`},cache:'no-store'});const data=await response.json();
 if(!response.ok){result.textContent=`ไม่สำเร็จ (${response.status}): ${data.error || 'โปรดลองใหม่'}`;return;}
 result.textContent=data.summary || `เชื่อมต่อฐานข้อมูลสำเร็จ\nกลุ่มที่พบ: ${data.groups.length}\n`+data.groups.map(g=>`${g.display_name || g.group_id} — รับข้อความ: ${g.ingest_enabled?'เปิด':'ปิด'} / รับรายงาน: ${g.report_enabled?'เปิด':'ปิด'}`).join('\n');
 }catch{result.textContent='ติดต่อระบบไม่สำเร็จ';}
}
document.getElementById('status').onclick=()=>read('/api/status');
document.getElementById('summary').onclick=()=>read('/api/summary?date='+encodeURIComponent(dateField.value));
document.getElementById('clear').onclick=()=>{keyField.value='';result.textContent='ล้างข้อมูลบนหน้านี้แล้ว';};
