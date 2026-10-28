"""Reencoda somente cópias de distribuição; fonte offline permanece intacta."""
import concurrent.futures, hashlib, json, pathlib, subprocess, sys

source = pathlib.Path(sys.argv[1]).resolve()
target = pathlib.Path(sys.argv[2]).resolve()
report_path = pathlib.Path(sys.argv[3]).resolve()
assert source != target

def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True, encoding='utf-8').stdout

def probe(file):
    data = json.loads(run(['ffprobe','-v','error','-select_streams','v:0','-count_packets','-show_entries',
        'stream=codec_name,width,height,r_frame_rate,nb_read_packets:stream_tags=alpha_mode:format=duration,size','-of','json',str(file)]))
    return data

def encode(file):
    relative = file.relative_to(target)
    original = source / relative
    before = probe(original)
    temporary = file.with_name(file.stem+'.encoding.webm')
    if temporary.exists(): raise RuntimeError(f'Temporary already exists: {temporary}')
    run(['ffmpeg','-hide_banner','-loglevel','error','-c:v','libvpx-vp9','-i',str(original),
         '-map','0:v:0','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-b:v','0','-crf','30',
         '-deadline','good','-cpu-used','4','-row-mt','1','-threads','4','-an',str(temporary)])
    after = probe(temporary)
    a,b = before['streams'][0],after['streams'][0]
    for key in ['width','height','r_frame_rate','nb_read_packets']:
        assert a[key] == b[key], (str(relative),key,a[key],b[key])
    assert {k.lower():v for k,v in b.get('tags',{}).items()}.get('alpha_mode') == '1'
    assert abs(float(before['format']['duration'])-float(after['format']['duration'])) < 0.1
    alpha=run(['ffmpeg','-hide_banner','-loglevel','error','-c:v','libvpx-vp9','-i',str(temporary),
        '-vf','alphaextract,signalstats,metadata=print:file=-','-frames:v','1','-f','null','-'])
    assert 'lavfi.signalstats.YMIN=0' in alpha and 'lavfi.signalstats.YMAX=255' in alpha, str(relative)
    assert temporary.stat().st_size < original.stat().st_size
    temporary.replace(file)
    return {'path':relative.as_posix(),'beforeBytes':original.stat().st_size,'afterBytes':file.stat().st_size,
        'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'width':b['width'],'height':b['height'],
        'frames':b['nb_read_packets'],'frameRate':b['r_frame_rate'],'alphaVerified':True}

files=sorted(target.rglob('*.webm'))
assert len(files)==94
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for future in concurrent.futures.as_completed([pool.submit(encode,f) for f in files]):
        results.append(future.result())
        report_path.write_text(json.dumps({'completed':len(results),'total':len(files),'files':results},ensure_ascii=False,indent=2),encoding='utf-8')
        print(f'{len(results)}/{len(files)} {results[-1]["path"]}',flush=True)
print(json.dumps({'status':'PASS','files':len(results),'beforeBytes':sum(r['beforeBytes'] for r in results),
    'afterBytes':sum(r['afterBytes'] for r in results)}),flush=True)
