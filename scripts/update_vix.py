"""Refresh the bundled Cboe VIX daily snapshot without browser CORS or API keys."""
import csv,io,json,datetime,urllib.request,pathlib
url='https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv'
request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
with urllib.request.urlopen(request,timeout=30) as response:
    rows=list(csv.DictReader(io.StringIO(response.read().decode('utf-8-sig'))))
bars=[]
for row in rows:
    day=datetime.datetime.strptime(row['DATE'],'%m/%d/%Y').date()
    values={key:float(row[key.upper()]) for key in ['open','high','low','close']}
    if not all(__import__('math').isfinite(v) and v>0 for v in values.values()):continue
    bars.append({'date':day.isoformat(),**values})
bars.sort(key=lambda b:b['date'])
assert len(bars)>250
end=datetime.date.fromisoformat(bars[-1]['date']);start=end-datetime.timedelta(days=365)
result={'source':url,'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'bars':[b for b in bars if b['date']>=start.isoformat()]}
path=pathlib.Path(__file__).resolve().parent.parent/'assets/vix.json'
path.write_text(json.dumps(result,separators=(',',':'))+'\n')
print('VIX official snapshot:',bars[-1]['date'],bars[-1]['close'])
