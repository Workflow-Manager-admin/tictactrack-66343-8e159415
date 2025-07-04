#!/bin/bash
cd /home/kavia/workspace/code-generation/tictactrack-66343-8e159415/tic_tac_toe_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

