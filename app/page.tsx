"use client"

import { useState, useEffect, useRef } from "react"

export default function Home() {
  const clockRef = useRef<HTMLDivElement>(null)
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const[selectedUnit, setSelectedUnit] = useState<"hour" | "minute">("minute")
  const[isRunning, setIsRunning] = useState(false)
  const[hours, setHours] = useState(1)
  const[minutes, setMinutes] = useState(10)
  const[remainingSeconds, setRemainingSeconds] = useState(0)
  const[isFinished, setIsFinished] = useState(false)
  const[showEndScreen, setShowEndScreen] = useState(false)
  const[typingDone, setTypingDone] = useState(false)

  function handleStart(){
    if(hours === 0 && minutes === 0) return

    setIsRunning(true)
    setRemainingSeconds(5)
    // setRemainingSeconds(hours*3600 + minutes*60)
  }

  const fullMessage = "お疲れ様でした。"
  const [typingIndex, setTypingIndex] = useState(0)

  function handleEnd(){
    if(showEndScreen) return
    setShowEndScreen(true)
    setTypingDone(false)
    setTypingIndex(0)
  }

  useEffect(() => {
  if(!showEndScreen) return
  if(typingDone) return

    const id = setInterval(() => {
      setTypingIndex(prev => {
        if(prev >= fullMessage.length){
          clearInterval(id)
          setTypingDone(true)
          return prev
        }
        return prev + 1
      })
    }, 150)

    return () => clearInterval(id)
  }, [showEndScreen, typingDone])

  const displayedMessage = fullMessage.slice(0, typingIndex)

  function handleTapEndScreen(){
    if(!typingDone) return
    setShowEndScreen(false)
    setIsRunning(false)
    setIsFinished(false)
  }

  useEffect(()=>{
    if(!isRunning) return

    const intervalId = setInterval(()=>{
      setRemainingSeconds(prev=>{
        if(prev<=1){
          clearInterval(intervalId)
          setIsFinished(true)
          return 0
        }
        return prev-1
      })
    },1000)
    return()=>{
      clearInterval(intervalId)
    }
  },[isRunning])

  function handleSelectHour(){
    setSelectedUnit("hour")
  }

  function handleSelectMinute(){
    setSelectedUnit("minute")
  }

  useEffect(()=>{
    const clockE1 = clockRef.current
    if(!clockE1) return
    function handleWheelNative(event:WheelEvent){
      event.preventDefault()
      if(isRunning) return
      const direction = event.deltaY>0 ? 1:-1
      if(selectedUnit == "hour"){
        setHours(prev => Math.max(0, prev+direction))
      }else{
        setMinutes(prev =>{
          let next = prev+direction*10
          if(next < 0) next=50
          if(next >= 60) next=0
          return next
        })
      }
    }

    clockE1.addEventListener("wheel",handleWheelNative,{passive:false})
    return() =>{
      clockE1.removeEventListener("wheel",handleWheelNative)
    }
  },[isRunning, selectedUnit])

  const displayHours = isRunning?Math.floor(remainingSeconds/3600):hours
  const displayMinutes = isRunning?Math.floor((remainingSeconds%3600)/60):minutes
  const displaySeconds = isRunning?remainingSeconds%60:0
  return (
    <>
      <header>
        <div id="title">
          <div id="title-text">FOCUS</div>
          <div id="title-dot">.</div>
        </div>
      </header>

      {showEndScreen && (
        <div id="end-screen" onClick={handleTapEndScreen}>
          <p id="end-message">{displayedMessage}</p>
        </div>
      )}

      <main>
        <div id="menu">
          <div id="menu-mypage">⚪︎my-page</div>
          <div id="menu-friend">◎friend</div>
        </div>

        <div id="clock" ref={clockRef}>
          <div id="time">
            <span id="hour" className={`time-part ${selectedUnit === "hour" ? "selected" : ""}`} onClick={handleSelectHour}>{String(displayHours).padStart(2,"0")}</span>
            <span className="colon">:</span>
            <span id="minute" className={`time-part ${selectedUnit === "minute" ? "selected" : ""}`} onClick={handleSelectMinute}>{String(displayMinutes).padStart(2,"0")}</span>
            <span className="colon">:</span>
            <span id="second">{String(displaySeconds).padStart(2,"0")}</span>
          </div>
        </div>

        {!isRunning && (
          <button id="start-button" onClick={handleStart}>開始</button>
        )}
        {isRunning && isFinished && (
          <button id="end-button" onClick={handleEnd}>終了</button>
        )}

        <div id="list">
          <div id="list-box">
            <ul id="checklist">
              <li className="new-list">
                <input type="checkbox" disabled/>
                <input type="text" className="item-text" id="new-item-input" placeholder=""/>
                <button id="add-button">+</button>
              </li>
            </ul>
          </div>
        </div>

      </main>

      <footer></footer>
    </>
  );
}
